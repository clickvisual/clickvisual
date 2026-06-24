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

type ProviderConfig struct {
	BaseURL            string
	APIKey             string
	Model              string
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

type OpenAICompatibleProvider struct{}

func (OpenAICompatibleProvider) CompleteText(
	ctx context.Context,
	cfg ProviderConfig,
	messages []Message,
	options CompletionOptions,
) (string, error) {
	if strings.TrimSpace(cfg.APIKey) == "" || strings.TrimSpace(cfg.Model) == "" {
		return "", fmt.Errorf("ai provider config is incomplete")
	}
	if len(messages) == 0 {
		return "", fmt.Errorf("ai provider messages are empty")
	}

	baseURL := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	timeoutSeconds := cfg.TimeoutSeconds
	if timeoutSeconds <= 0 {
		timeoutSeconds = 5
	}
	temperature := cfg.DefaultTemperature
	if options.Temperature != nil {
		temperature = *options.Temperature
	}
	maxTokens := cfg.DefaultMaxTokens
	if options.MaxTokens > 0 {
		maxTokens = options.MaxTokens
	}

	reqBody := map[string]interface{}{
		"model":       cfg.Model,
		"messages":    messages,
		"temperature": temperature,
	}
	if maxTokens > 0 {
		reqBody["max_tokens"] = maxTokens
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	resp, err := client.Do(request)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= http.StatusBadRequest {
		rawBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		bodyText := strings.TrimSpace(string(rawBody))
		if bodyText != "" {
			return "", fmt.Errorf("ai request failed: %s: %s", resp.Status, bodyText)
		}
		return "", fmt.Errorf("ai request failed: %s", resp.Status)
	}

	var payload struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if len(payload.Choices) == 0 {
		return "", fmt.Errorf("ai response is empty")
	}
	return strings.TrimSpace(payload.Choices[0].Message.Content), nil
}
