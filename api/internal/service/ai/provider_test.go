package ai

import (
	"context"
	"strings"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOpenAICompatibleProviderCompleteText(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"OK"}}]}`))
	}))
	defer server.Close()

	provider := OpenAICompatibleProvider{}
	out, err := provider.CompleteText(context.Background(), ProviderConfig{
		BaseURL:            server.URL,
		APIKey:             "secret",
		Model:              "gpt-test",
		TimeoutSeconds:     2,
		DefaultTemperature: 0.2,
		DefaultMaxTokens:   16,
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

func TestOpenAICompatibleProviderCompleteTextErrorIncludesBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"error":"upstream overloaded"}`))
	}))
	defer server.Close()

	provider := OpenAICompatibleProvider{}
	_, err := provider.CompleteText(context.Background(), ProviderConfig{
		BaseURL:            server.URL,
		APIKey:             "secret",
		Model:              "gpt-test",
		TimeoutSeconds:     2,
		DefaultTemperature: 0.2,
		DefaultMaxTokens:   16,
	}, []Message{
		{Role: "system", Content: "system"},
		{Role: "user", Content: "user"},
	}, CompletionOptions{})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "upstream overloaded") {
		t.Fatalf("expected error body in message, got %v", err)
	}
}
