package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	ProviderKindOpenAI          = "openai"
	ProviderKindOpenAIResponses = "openai-responses"
	ProviderKindAnthropic       = "anthropic"

	anthropicVersion          = "2023-06-01"
	anthropicDefaultMaxTokens = 1024
)

type ProviderConfig struct {
	Key                string
	Name               string
	Kind               string
	BaseURL            string
	APIKey             string
	Model              string
	ReasoningEffort    string
	TimeoutSeconds     int
	DefaultTemperature float64
	DefaultMaxTokens   int
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type CompletionOptions struct {
	Temperature *float64 `json:"temperature,omitempty"`
	MaxTokens   int      `json:"maxTokens,omitempty"`
}

type Provider interface {
	CompleteText(ctx context.Context, cfg ProviderConfig, messages []Message, options CompletionOptions) (string, error)
}

func providerFor(kind string) Provider {
	if kind == ProviderKindOpenAIResponses {
		return OpenAIResponsesProvider{}
	}
	if kind == ProviderKindAnthropic {
		return AnthropicProvider{}
	}
	return OpenAICompatibleProvider{}
}

// trimAPIVersion drops a trailing /v1 because the request paths below add it;
// gateways are usually documented with it.
func trimAPIVersion(baseURL string) string {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	return strings.TrimSuffix(baseURL, "/v1")
}

func resolveCompletionParams(cfg ProviderConfig, options CompletionOptions) (timeout time.Duration, temperature float64, maxTokens int) {
	timeoutSeconds := cfg.TimeoutSeconds
	if timeoutSeconds <= 0 {
		timeoutSeconds = 5
	}
	temperature = cfg.DefaultTemperature
	if options.Temperature != nil {
		temperature = *options.Temperature
	}
	maxTokens = cfg.DefaultMaxTokens
	if options.MaxTokens > 0 {
		maxTokens = options.MaxTokens
	}
	return time.Duration(timeoutSeconds) * time.Second, temperature, maxTokens
}

func validateRequest(cfg ProviderConfig, messages []Message) error {
	if strings.TrimSpace(cfg.APIKey) == "" || strings.TrimSpace(cfg.Model) == "" {
		return fmt.Errorf("ai provider config is incomplete")
	}
	if len(messages) == 0 {
		return fmt.Errorf("ai provider messages are empty")
	}
	return nil
}

func postJSON(ctx context.Context, timeout time.Duration, url string, headers map[string]string, body interface{}, out interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		request.Header.Set(key, value)
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(request)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= http.StatusBadRequest {
		rawBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		bodyText := strings.TrimSpace(string(rawBody))
		if bodyText != "" {
			return fmt.Errorf("ai request failed: %s: %s", resp.Status, bodyText)
		}
		return fmt.Errorf("ai request failed: %s", resp.Status)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

type OpenAICompatibleProvider struct{}

type OpenAIResponsesProvider struct{}

func (OpenAIResponsesProvider) CompleteText(ctx context.Context, cfg ProviderConfig, messages []Message, options CompletionOptions) (string, error) {
	if err := validateRequest(cfg, messages); err != nil {
		return "", err
	}
	baseURL := trimAPIVersion(cfg.BaseURL)
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	timeout, _, maxTokens := resolveCompletionParams(cfg, options)
	body := map[string]any{"model": cfg.Model, "input": messages, "stream": false, "store": false}
	if maxTokens > 0 {
		body["max_output_tokens"] = maxTokens
	}
	if cfg.ReasoningEffort != "" {
		body["reasoning"] = map[string]string{"effort": cfg.ReasoningEffort}
	}
	var payload struct {
		Status string `json:"status"`
		Output []struct {
			Type    string `json:"type"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}
	if err := postJSON(ctx, timeout, baseURL+"/v1/responses", map[string]string{"Authorization": "Bearer " + cfg.APIKey}, body, &payload); err != nil {
		return "", err
	}
	if payload.Status != "" && payload.Status != "completed" {
		return "", fmt.Errorf("ai response did not complete: %s", payload.Status)
	}
	var texts []string
	for _, item := range payload.Output {
		if item.Type != "message" {
			continue
		}
		for _, content := range item.Content {
			if content.Type == "output_text" && strings.TrimSpace(content.Text) != "" {
				texts = append(texts, content.Text)
			}
		}
	}
	if len(texts) == 0 {
		return "", fmt.Errorf("ai response is empty")
	}
	return strings.TrimSpace(strings.Join(texts, "\n")), nil
}

func (OpenAICompatibleProvider) CompleteText(
	ctx context.Context,
	cfg ProviderConfig,
	messages []Message,
	options CompletionOptions,
) (string, error) {
	if err := validateRequest(cfg, messages); err != nil {
		return "", err
	}
	baseURL := trimAPIVersion(cfg.BaseURL)
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	timeout, temperature, maxTokens := resolveCompletionParams(cfg, options)

	reqBody := map[string]interface{}{
		"model":       cfg.Model,
		"messages":    messages,
		"temperature": temperature,
	}
	if maxTokens > 0 {
		reqBody["max_tokens"] = maxTokens
	}
	if cfg.ReasoningEffort != "" {
		reqBody["reasoning_effort"] = cfg.ReasoningEffort
	}

	var payload struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	headers := map[string]string{"Authorization": "Bearer " + cfg.APIKey}
	if err := postJSON(ctx, timeout, baseURL+"/v1/chat/completions", headers, reqBody, &payload); err != nil {
		return "", err
	}
	if len(payload.Choices) == 0 {
		return "", fmt.Errorf("ai response is empty")
	}
	return strings.TrimSpace(payload.Choices[0].Message.Content), nil
}

type AnthropicProvider struct{}

func (AnthropicProvider) CompleteText(
	ctx context.Context,
	cfg ProviderConfig,
	messages []Message,
	options CompletionOptions,
) (string, error) {
	if err := validateRequest(cfg, messages); err != nil {
		return "", err
	}
	baseURL := trimAPIVersion(cfg.BaseURL)
	if baseURL == "" {
		baseURL = "https://api.anthropic.com"
	}
	timeout, temperature, maxTokens := resolveCompletionParams(cfg, options)
	if maxTokens <= 0 {
		maxTokens = anthropicDefaultMaxTokens
	}

	var system []string
	chat := make([]Message, 0, len(messages))
	for _, message := range messages {
		if message.Role == "system" {
			system = append(system, message.Content)
			continue
		}
		chat = append(chat, message)
	}
	if len(chat) == 0 {
		return "", fmt.Errorf("ai provider messages are empty")
	}

	reqBody := map[string]interface{}{
		"model":       cfg.Model,
		"messages":    chat,
		"max_tokens":  maxTokens,
		"temperature": temperature,
	}
	if len(system) > 0 {
		reqBody["system"] = strings.Join(system, "\n\n")
	}

	var payload struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	headers := map[string]string{
		"x-api-key":         cfg.APIKey,
		"anthropic-version": anthropicVersion,
	}
	if err := postJSON(ctx, timeout, baseURL+"/v1/messages", headers, reqBody, &payload); err != nil {
		return "", err
	}
	var text strings.Builder
	for _, block := range payload.Content {
		if block.Type == "text" {
			text.WriteString(block.Text)
		}
	}
	if text.Len() == 0 {
		return "", fmt.Errorf("ai response is empty")
	}
	return strings.TrimSpace(text.String()), nil
}
