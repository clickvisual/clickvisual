package view

import "encoding/json"

const (
	AIScenarioQueryIngestionDetectExplain  = "query.ingestion.detect_explain"
	AIScenarioQueryIngestionFieldRecommend = "query.ingestion.field_recommend"
	AIScenarioQueryIngestionPublishSummary = "query.ingestion.publish_summary"
	AIScenarioQueryLinkAnalyze             = "query.link.analyze"
)

type AIRunOptions struct {
	Temperature *float64 `json:"temperature,omitempty"`
	MaxTokens   int      `json:"maxTokens,omitempty"`
}

type ReqAIRun struct {
	Scenario string          `json:"scenario" binding:"required"`
	Input    json.RawMessage `json:"input" binding:"required"`
	Options  AIRunOptions    `json:"options"`
}

type AIIngestionDetectExplainInput struct {
	Result DetectionResult `json:"result"`
}

type AIIngestionFieldRecommendInput struct {
	Fields []QueryableField `json:"fields"`
}

type AIIngestionPublishSummaryInput struct {
	Normalization NormalizationDraft `json:"normalization"`
	Fields        []QueryableField   `json:"fields"`
	DefaultFields []string           `json:"defaultFields"`
	Warnings      []QueryWarning     `json:"warnings"`
}

type AILinkLogSource struct {
	TableID      int    `json:"tableId"`
	DatabaseName string `json:"databaseName"`
	TableName    string `json:"tableName"`
}

type AILinkLogItem struct {
	Sequence   int                    `json:"sequence"`
	Source     AILinkLogSource        `json:"source"`
	Time       string                 `json:"time"`
	TimeSource string                 `json:"timeSource"`
	Level      string                 `json:"level"`
	Message    string                 `json:"message"`
	Fields     map[string]interface{} `json:"fields"`
}

type AILinkAnalyzeInput struct {
	AnchorField   string            `json:"anchorField"`
	AnchorValue   string            `json:"anchorValue"`
	AnchorTime    int64             `json:"anchorTime"`
	WindowMinutes int               `json:"windowMinutes"`
	Query         string            `json:"query"`
	Range         map[string]int64  `json:"range"`
	Tables        []AILinkLogSource `json:"tables"`
	Logs          []AILinkLogItem   `json:"logs"`
}
