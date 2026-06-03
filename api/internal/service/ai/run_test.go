package ai

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestDecodeAIDraft(t *testing.T) {
	out, err := decodeAIDraft("```json\n{\"summary\":\"ok\",\"decisions\":[],\"risks\":[],\"suggestions\":[],\"requiresUserConfirmation\":true}\n```")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if out.Summary != "ok" {
		t.Fatalf("expected summary ok, got %q", out.Summary)
	}
	if !out.RequiresUserConfirmation {
		t.Fatalf("expected requiresUserConfirmation true")
	}
}

func TestDecodeAIDraftWrapsSingletonCollections(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":"ok",
		"decisions":{"key":"time","title":"时间字段","description":"use time"},
		"risks":{"code":"r1","level":"warning","message":"check time"},
		"suggestions":{"type":"normalization","title":"解析草案","description":"enable nested json"},
		"requiresUserConfirmation":true
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(out.Decisions) != 1 {
		t.Fatalf("expected 1 decision, got %d", len(out.Decisions))
	}
	if len(out.Risks) != 1 {
		t.Fatalf("expected 1 risk, got %d", len(out.Risks))
	}
	if len(out.Suggestions) != 1 {
		t.Fatalf("expected 1 suggestion, got %d", len(out.Suggestions))
	}
}

func TestDecodeAIDraftNormalizesRequiresUserConfirmation(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":"ok",
		"decisions":[],
		"risks":[],
		"suggestions":[],
		"requiresUserConfirmation":[true]
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if !out.RequiresUserConfirmation {
		t.Fatalf("expected requiresUserConfirmation true")
	}
}

func TestDecodeAIDraftNormalizesRichGatewayShape(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":"ok",
		"decisions":{
			"timeField":{
				"recommended":"contents._time_",
				"alternatives":["time"],
				"reason":"best match"
			}
		},
		"risks":[],
		"suggestions":["建议一","建议二"],
		"requiresUserConfirmation":["确认时间字段"]
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(out.Decisions) != 1 {
		t.Fatalf("expected 1 decision, got %d", len(out.Decisions))
	}
	if out.Decisions[0].Key != "timeField" {
		t.Fatalf("expected timeField key, got %s", out.Decisions[0].Key)
	}
	if len(out.Suggestions) != 2 {
		t.Fatalf("expected 2 suggestions, got %d", len(out.Suggestions))
	}
	if out.Suggestions[0].Description != "建议一" {
		t.Fatalf("unexpected suggestion description: %s", out.Suggestions[0].Description)
	}
	if !out.RequiresUserConfirmation {
		t.Fatalf("expected requiresUserConfirmation true")
	}
}

func TestDecodeAIDraftNormalizesStringRisks(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":"ok",
		"decisions":[],
		"risks":["风险一","风险二"],
		"suggestions":[],
		"requiresUserConfirmation":true
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(out.Risks) != 2 {
		t.Fatalf("expected 2 risks, got %d", len(out.Risks))
	}
	if out.Risks[0].Message != "风险一" {
		t.Fatalf("unexpected risk message: %s", out.Risks[0].Message)
	}
}

func TestDecodeAIDraftNormalizesObjectSummary(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":{
			"recommendedDefaultFields":["a","b"],
			"candidateNumericFields":["c"],
			"excludedFromDefault":["d"],
			"basis":"coverage missing"
		},
		"decisions":[],
		"risks":[],
		"suggestions":[],
		"requiresUserConfirmation":true
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if !strings.Contains(out.Summary, "coverage missing") {
		t.Fatalf("unexpected summary: %s", out.Summary)
	}
	if !strings.Contains(out.Summary, "推荐默认字段：a、b") {
		t.Fatalf("unexpected summary: %s", out.Summary)
	}
}

func TestDecodeAIDraftNormalizesDecisionArrayObjects(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":"ok",
		"decisions":[
			{
				"fieldKey":"k8s.namespace.name",
				"action":"recommend",
				"priority":"high",
				"reasons":["通用过滤维度","可直接过滤"],
				"caveat":"需要人工确认"
			}
		],
		"risks":[{"type":"coverage_missing","level":"high","detail":"coverage missing"}],
		"suggestions":[{"type":"default_set","detail":"use light defaults"}],
		"requiresUserConfirmation":true
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if out.Decisions[0].Title != "k8s.namespace.name" {
		t.Fatalf("unexpected title: %s", out.Decisions[0].Title)
	}
	if !strings.Contains(out.Decisions[0].Description, "动作：recommend") {
		t.Fatalf("unexpected decision description: %s", out.Decisions[0].Description)
	}
	if out.Risks[0].Code != "coverage_missing" {
		t.Fatalf("unexpected risk code: %s", out.Risks[0].Code)
	}
	if out.Risks[0].Message != "coverage missing" {
		t.Fatalf("unexpected risk message: %s", out.Risks[0].Message)
	}
	if out.Suggestions[0].Description != "use light defaults" {
		t.Fatalf("unexpected suggestion description: %s", out.Suggestions[0].Description)
	}
}

func TestDecodeAIDraftSuggestionPayloadContainsFieldKeys(t *testing.T) {
	out, err := decodeAIDraft(`{
		"summary":"ok",
		"decisions":[],
		"risks":[],
		"suggestions":[{"type":"default_set","detail":"use light defaults","fields":["a","b"]}],
		"requiresUserConfirmation":true
	}`)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	payload, ok := out.Suggestions[0].Payload.(map[string]interface{})
	if !ok {
		t.Fatalf("expected payload map, got %#v", out.Suggestions[0].Payload)
	}
	fieldKeys, ok := payload["fieldKeys"].([]interface{})
	if !ok || len(fieldKeys) != 2 {
		t.Fatalf("expected fieldKeys payload, got %#v", payload["fieldKeys"])
	}
}

func TestBuildScenarioMessagesUnsupported(t *testing.T) {
	_, err := buildScenarioMessages(view.ReqAIRun{
		Scenario: "unknown",
		Input:    json.RawMessage(`{}`),
	})
	if err == nil {
		t.Fatalf("expected unsupported scenario error")
	}
}

func TestBuildScenarioMessagesDetectExplain(t *testing.T) {
	input, _ := json.Marshal(view.AIIngestionDetectExplainInput{
		Result: view.DetectionResult{
			TimeCandidates: []view.Candidate{{Path: "time", Confidence: 0.9, Reason: "ts"}},
			BodyCandidates: []view.Candidate{{Path: "body", Confidence: 0.8, Reason: "json"}},
		},
	})
	msgs, err := buildScenarioMessages(view.ReqAIRun{
		Scenario: view.AIScenarioQueryIngestionDetectExplain,
		Input:    input,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
}
