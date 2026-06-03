package report

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	aisvc "github.com/clickvisual/clickvisual/api/internal/service/ai"
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

	model := strings.TrimSpace(econf.GetString("report.summary.ai.model"))
	apiKey := strings.TrimSpace(econf.GetString("report.summary.ai.apiKey"))
	if model == "" || apiKey == "" {
		return "", fmt.Errorf("report summary ai config is incomplete")
	}
	provider := aisvc.OpenAICompatibleProvider{}
	return provider.CompleteText(context.Background(), aisvc.ProviderConfig{
		BaseURL:            strings.TrimSpace(econf.GetString("report.summary.ai.baseURL")),
		APIKey:             apiKey,
		Model:              model,
		TimeoutSeconds:     econf.GetInt("report.summary.ai.timeout"),
		DefaultTemperature: 0.2,
		DefaultMaxTokens:   0,
	}, []aisvc.Message{
		{
			Role:    "system",
			Content: "你是报表推送摘要助手。请用1到3句中文总结业务趋势，只基于输入事实，不暴露SQL、DSL、where原文，不编造业务背景。",
		},
		{
			Role:    "user",
			Content: buildSummaryPrompt(input, econf.GetInt("report.summary.ai.maxRows")),
		},
	}, aisvc.CompletionOptions{})
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
