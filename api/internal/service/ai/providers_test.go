package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestAnthropicProviderCompleteText(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/messages" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("x-api-key") != "secret" || r.Header.Get("anthropic-version") == "" {
			t.Fatalf("missing anthropic headers: %v", r.Header)
		}
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if body["system"] != "system" {
			t.Fatalf("expected system prompt lifted out of messages, got %v", body["system"])
		}
		if messages := body["messages"].([]interface{}); len(messages) != 1 {
			t.Fatalf("expected only the user message, got %v", messages)
		}
		if body["max_tokens"].(float64) <= 0 {
			t.Fatalf("anthropic requires max_tokens, got %v", body["max_tokens"])
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"content":[{"type":"text","text":"OK"}]}`))
	}))
	defer server.Close()

	out, err := AnthropicProvider{}.CompleteText(context.Background(), ProviderConfig{
		BaseURL:        server.URL + "/v1",
		APIKey:         "secret",
		Model:          "claude-test",
		TimeoutSeconds: 2,
	}, []Message{
		{Role: "system", Content: "system"},
		{Role: "user", Content: "user"},
	}, CompletionOptions{})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if out != "OK" {
		t.Fatalf("expected OK, got %q", out)
	}
}

func TestOpenAICompatibleProviderSendsReasoningEffortAndTrimsVersion(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		var body map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["reasoning_effort"] != "low" {
			t.Fatalf("expected reasoning_effort=low, got %v", body["reasoning_effort"])
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"OK"}}]}`))
	}))
	defer server.Close()

	_, err := OpenAICompatibleProvider{}.CompleteText(context.Background(), ProviderConfig{
		BaseURL:         server.URL + "/v1/",
		APIKey:          "secret",
		Model:           "gpt-test",
		ReasoningEffort: "low",
		TimeoutSeconds:  2,
	}, []Message{{Role: "user", Content: "hi"}}, CompletionOptions{})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestResponsesProviderUsesConfiguredEndpointAndReturnsOnlyAnswer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/responses" || r.Header.Get("Authorization") != "Bearer test-key" {
			t.Error("unexpected Responses request")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body["model"] != "grok-test" || body["max_output_tokens"] != float64(200) || body["store"] != false {
			t.Errorf("unexpected model, output limit or storage setting")
		}
		if body["reasoning"].(map[string]any)["effort"] != "low" {
			t.Error("missing reasoning effort")
		}
		_, _ = w.Write([]byte(`{"status":"completed","output":[{"type":"reasoning","content":[{"type":"output_text","text":"internal reasoning"}]},{"type":"message","content":[{"type":"output_text","text":"有排队延迟的证据。"}]}]}`))
	}))
	defer server.Close()
	out, err := providerFor(ProviderKindOpenAIResponses).CompleteText(context.Background(), ProviderConfig{
		BaseURL: server.URL + "/v1/", APIKey: "test-key", Model: "grok-test", TimeoutSeconds: 2, ReasoningEffort: "low",
	}, []Message{{Role: "user", Content: "分析日志"}}, CompletionOptions{MaxTokens: 200})
	if err != nil || out != "有排队延迟的证据。" {
		t.Fatalf("unexpected answer: %q, %v", out, err)
	}
}

func TestResponsesProviderRejectsIncompleteAndEmptyReplies(t *testing.T) {
	for _, response := range []string{
		`{"status":"incomplete","output":[{"type":"message","content":[{"type":"output_text","text":"partial"}]}]}`,
		`{"status":"completed","output":[]}`,
	} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(response)) }))
		_, err := (OpenAIResponsesProvider{}).CompleteText(context.Background(), ProviderConfig{
			BaseURL: server.URL, APIKey: "test-key", Model: "grok-test", TimeoutSeconds: 2,
		}, []Message{{Role: "user", Content: "分析"}}, CompletionOptions{})
		server.Close()
		if err == nil {
			t.Fatal("expected invalid response to fail")
		}
	}
}

func TestCompleteWithFallbackUsesNextProvider(t *testing.T) {
	failing := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer failing.Close()
	working := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"from backup"}}]}`))
	}))
	defer working.Close()

	chain := []ProviderConfig{
		{Key: "primary", Kind: ProviderKindOpenAI, BaseURL: failing.URL, APIKey: "k", Model: "m", TimeoutSeconds: 2},
		{Key: "backup", Kind: ProviderKindOpenAI, BaseURL: working.URL, APIKey: "k", Model: "m", TimeoutSeconds: 2},
	}
	out, used, err := completeWithFallback(context.Background(), chain, []Message{{Role: "user", Content: "hi"}}, CompletionOptions{})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if out != "from backup" || used.Key != "backup" {
		t.Fatalf("expected backup answer, got %q from %q", out, used.Key)
	}

	_, _, err = completeWithFallback(context.Background(), chain[:1], []Message{{Role: "user", Content: "hi"}}, CompletionOptions{})
	if err == nil || !strings.Contains(err.Error(), "primary") {
		t.Fatalf("expected error naming the failed provider, got %v", err)
	}
}

func TestNormalizeProvider(t *testing.T) {
	valid := view.AIProviderItem{
		ID:      " Grok ",
		Kind:    "openai",
		BaseURL: "https://api.x.ai/v1/",
		Model:   "grok-4",
		APIKey:  "sk-test",
	}
	got, err := normalizeProvider(valid, nil)
	if err != nil {
		t.Fatalf("expected valid provider, got %v", err)
	}
	if got.ID != "grok" || got.Name != "grok" || got.BaseURL != "https://api.x.ai/v1" {
		t.Fatalf("unexpected normalized provider: %+v", got)
	}

	keep := valid
	keep.ID = "grok"
	keep.APIKey = ""
	got, err = normalizeProvider(keep, map[string]string{"grok": "stored"})
	if err != nil || got.APIKey != "stored" {
		t.Fatalf("expected stored key to be kept, got %q, %v", got.APIKey, err)
	}

	anthropic := valid
	anthropic.Kind = "anthropic"
	anthropic.ReasoningEffort = "high"
	got, err = normalizeProvider(anthropic, nil)
	if err != nil || got.ReasoningEffort != "" {
		t.Fatalf("expected reasoning effort dropped for anthropic, got %q, %v", got.ReasoningEffort, err)
	}
	responses := valid
	responses.Kind = ProviderKindOpenAIResponses
	responses.ReasoningEffort = "low"
	got, err = normalizeProvider(responses, nil)
	if err != nil || got.ReasoningEffort != "low" {
		t.Fatalf("expected Responses provider to preserve reasoning effort: %v", err)
	}

	cases := map[string]func(item *view.AIProviderItem){
		"bad id":       func(item *view.AIProviderItem) { item.ID = "Bad ID!" },
		"bad kind":     func(item *view.AIProviderItem) { item.Kind = "gemini" },
		"bad base url": func(item *view.AIProviderItem) { item.BaseURL = "api.x.ai" },
		"no model":     func(item *view.AIProviderItem) { item.Model = "" },
		"bad effort":   func(item *view.AIProviderItem) { item.ReasoningEffort = "max" },
		"no key":       func(item *view.AIProviderItem) { item.APIKey = "" },
	}
	for name, mutate := range cases {
		item := valid
		mutate(&item)
		if _, err := normalizeProvider(item, nil); err == nil {
			t.Fatalf("%s: expected error", name)
		}
	}
}
