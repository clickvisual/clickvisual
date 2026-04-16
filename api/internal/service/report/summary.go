package report

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type reportSummaryInput struct {
	Title          string
	ReportName     string
	Description    string
	Source         string
	TimeRangeLabel string
	ScopeLabel     string
	QueryRows      []map[string]interface{}
	StartedAt      time.Time
	Builder        *view.ReqReportBuilder
}

type reportSummarizer interface {
	Summarize(input reportSummaryInput) (string, error)
}

type summarizerFunc func(input reportSummaryInput) (string, error)

func (f summarizerFunc) Summarize(input reportSummaryInput) (string, error) {
	return f(input)
}

var reportContentSummarizer reportSummarizer = openAICompatibleSummarizer{}

type openAICompatibleSummarizer struct{}

func (openAICompatibleSummarizer) Summarize(input reportSummaryInput) (string, error) {
	if !econf.GetBool("report.summary.ai.enabled") {
		return "", nil
	}

	baseURL := strings.TrimRight(strings.TrimSpace(econf.GetString("report.summary.ai.baseURL")), "/")
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	apiKey := strings.TrimSpace(econf.GetString("report.summary.ai.apiKey"))
	model := strings.TrimSpace(econf.GetString("report.summary.ai.model"))
	if apiKey == "" || model == "" {
		return "", fmt.Errorf("report summary ai config is incomplete")
	}

	timeoutSeconds := econf.GetInt("report.summary.ai.timeout")
	if timeoutSeconds <= 0 {
		timeoutSeconds = 5
	}

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "你是报表推送摘要助手。请用1到3句中文总结业务趋势，只基于输入事实，不暴露SQL、DSL、where原文，不编造业务背景。",
			},
			{
				"role":    "user",
				"content": buildSummaryPrompt(input, econf.GetInt("report.summary.ai.maxRows")),
			},
		},
		"temperature": 0.2,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequest(http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= http.StatusBadRequest {
		return "", fmt.Errorf("report summary request failed: %s", resp.Status)
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
		return "", fmt.Errorf("report summary response is empty")
	}
	return strings.TrimSpace(payload.Choices[0].Message.Content), nil
}

func buildSummaryPrompt(input reportSummaryInput, maxRows int) string {
	if maxRows <= 0 {
		maxRows = 5
	}
	rows := input.QueryRows
	if len(rows) > maxRows {
		rows = rows[:maxRows]
	}

	var builder strings.Builder
	builder.WriteString("请根据以下报表信息生成钉钉摘要：\n")
	builder.WriteString("报表名称：" + input.ReportName + "\n")
	builder.WriteString("报表说明：" + input.Description + "\n")
	builder.WriteString("数据源：" + input.Source + "\n")
	builder.WriteString("时间范围：" + input.TimeRangeLabel + "\n")
	builder.WriteString("数据范围：" + input.ScopeLabel + "\n")
	builder.WriteString("发送时间：" + formatReportTime(input.StartedAt) + "\n")
	builder.WriteString("查询结果：\n")
	if len(rows) == 0 {
		builder.WriteString("- 无数据\n")
	} else {
		builder.WriteString(renderQueryRowsAsMarkdown(dbmodel.Report{
			TemplateKey:   "report-builder-default",
			BuilderConfig: marshalReportBuilder(input.Builder),
		}, rows))
		builder.WriteString("\n")
	}
	builder.WriteString("要求：只输出1到3句中文总结，不要输出标题，不要复述原始条件。")
	return builder.String()
}

func buildSummaryInput(item view.RespReportListItem, editor view.RespReportEditorDraft, startedAt time.Time, queryRows []map[string]interface{}) reportSummaryInput {
	source, timeRangeLabel, scopeLabel := reportScopeLabels(editor.Builder)
	return reportSummaryInput{
		Title:          fmt.Sprintf("统计预览｜%s", item.Name),
		ReportName:     item.Name,
		Description:    reportDescription(item, editor),
		Source:         source,
		TimeRangeLabel: timeRangeLabel,
		ScopeLabel:     scopeLabel,
		QueryRows:      queryRows,
		StartedAt:      startedAt,
		Builder:        editor.Builder,
	}
}
