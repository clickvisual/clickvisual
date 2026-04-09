package report

import (
	"strings"
	"testing"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/stretchr/testify/assert"
)

func TestParseChannelResultsSupportsListAndMap(t *testing.T) {
	listRaw := `[{"channelId":201,"channelTyp":"dingtalk","success":1,"failed":0,"lastSentAt":"2026-03-31T10:00:00+08:00"}]`
	list := parseChannelResults(listRaw)
	if assert.Len(t, list, 1) {
		assert.Equal(t, 201, list[0].ChannelID)
		assert.Equal(t, "dingtalk", list[0].ChannelTyp)
		assert.Equal(t, 1, list[0].Success)
	}

	mapRaw := `{"201":{"channelId":201,"channelTyp":"dingtalk","success":2,"failed":1,"lastSentAt":"2026-03-31T10:01:00+08:00"}}`
	mapped := parseChannelResults(mapRaw)
	if assert.Len(t, mapped, 1) {
		assert.Equal(t, 201, mapped[0].ChannelID)
		assert.Equal(t, 2, mapped[0].Success)
		assert.Equal(t, 1, mapped[0].Failed)
	}

	detailRaw := `[{"channelId":201,"channelTyp":"dingtalk","success":1,"failed":0,"lastSentAt":"2026-03-31T10:02:00+08:00","attempts":2,"retried":1,"retryTimes":1,"retryInterval":3,"errors":["attempt 1/2: timeout"]}]`
	detailed := parseChannelResults(detailRaw)
	if assert.Len(t, detailed, 1) {
		assert.Equal(t, 201, detailed[0].ChannelID)
		assert.Equal(t, 1, detailed[0].Success)
		assert.Equal(t, 0, detailed[0].Failed)
	}
}

func TestAggregateDelivery(t *testing.T) {
	executions := []dbmodel.ReportExecution{
		{ChannelResults: `[{"channelId":201,"channelTyp":"dingtalk","success":1,"failed":0,"lastSentAt":"2026-03-31T10:00:00+08:00"}]`},
		{ChannelResults: `[{"channelId":201,"channelTyp":"dingtalk","success":0,"failed":1,"lastSentAt":"2026-03-31T10:05:00+08:00"},{"channelId":202,"channelTyp":"dingtalk","success":1,"failed":0,"lastSentAt":"2026-03-31T10:03:00+08:00"}]`},
	}
	summary := aggregateDelivery(1001, executions)
	assert.Equal(t, 1001, summary.ReportID)
	assert.Equal(t, 3, summary.Total)
	assert.Equal(t, 2, summary.Success)
	assert.Equal(t, 1, summary.Failed)
	assert.Len(t, summary.Channels, 2)
}

func TestScheduleStatusAndTypeMapping(t *testing.T) {
	assert.Equal(t, dbmodel.ReportScheduleStatusEnabled, reportScheduleStatusByTyp(0))
	assert.Equal(t, dbmodel.ReportScheduleStatusPaused, reportScheduleStatusByTyp(1))
	assert.Equal(t, 0, reportScheduleTypByStatus(dbmodel.ReportScheduleStatusEnabled))
	assert.Equal(t, 1, reportScheduleTypByStatus(dbmodel.ReportScheduleStatusPaused))
}

func TestExecutionStatusIncludesPartial(t *testing.T) {
	assert.Equal(t, dbmodel.ReportExecutionStatusSuccess, executionStatus(1, 0))
	assert.Equal(t, dbmodel.ReportExecutionStatusFailed, executionStatus(0, 1))
	assert.Equal(t, dbmodel.ReportExecutionStatusPartial, executionStatus(1, 1))
	assert.Equal(t, dbmodel.ReportExecutionStatusFailed, executionStatus(0, 0))
}

func TestValidateExecutionConfig(t *testing.T) {
	report := dbmodel.Report{
		Status:    dbmodel.ReportStatusEnabled,
		QueryMode: dbmodel.ReportQueryModeSQL,
		QueryText: "select 1",
	}
	schedule := dbmodel.ReportSchedule{
		Status:     dbmodel.ReportScheduleStatusEnabled,
		ChannelIDs: []int{201},
	}

	assert.NoError(t, validateExecutionConfig(report, true, schedule))

	report.Status = dbmodel.ReportStatusPaused
	assert.ErrorContains(t, validateExecutionConfig(report, true, schedule), "报表已暂停")

	report.Status = dbmodel.ReportStatusEnabled
	assert.ErrorContains(t, validateExecutionConfig(report, false, schedule), "未配置调度")

	schedule.Status = dbmodel.ReportScheduleStatusPaused
	assert.ErrorContains(t, validateExecutionConfig(report, true, schedule), "调度已暂停")

	schedule.Status = dbmodel.ReportScheduleStatusEnabled
	schedule.ChannelIDs = nil
	assert.ErrorContains(t, validateExecutionConfig(report, true, schedule), "未配置推送渠道")
}

func TestPreviewMessageReturnsAccelerationMessage(t *testing.T) {
	report := dbmodel.Report{
		TemplateKey:   "report-builder-default",
		BuilderConfig: `{"instanceId":1,"database":"logger","table":"orders","timeField":"event_time","timeRange":"1h","blocks":[{"key":"default","where":"1=1","metrics":[{"key":"count","label":"总量"}]}]}`,
		Status:        dbmodel.ReportStatusEnabled,
	}
	schedule := dbmodel.ReportSchedule{
		Status:     dbmodel.ReportScheduleStatusEnabled,
		ChannelIDs: []int{201},
	}

	msg := previewMessage(report, true, schedule, nil, dbmodel.ReportAcceleration{}, false)
	assert.Contains(t, msg, "报表加速未创建")

	msg = previewMessage(report, true, schedule, nil, dbmodel.ReportAcceleration{
		Status:       dbmodel.ReportAccelerationStatusError,
		ErrorMessage: "mv create failed",
	}, true)
	assert.Contains(t, msg, "报表加速失败")
	assert.Contains(t, msg, "mv create failed")

	msg = previewMessage(report, true, schedule, nil, dbmodel.ReportAcceleration{
		Status: dbmodel.ReportAccelerationStatusReady,
	}, true)
	assert.Contains(t, msg, "最近暂无执行记录")
}

func TestResolveRetryPolicy(t *testing.T) {
	maxAttempts, retryInterval := resolveRetryPolicy(dbmodel.ReportSchedule{
		IsRetry:       1,
		RetryTimes:    2,
		RetryInterval: 15,
	})
	assert.Equal(t, 3, maxAttempts)
	assert.Equal(t, 15, retryInterval)

	maxAttempts, retryInterval = resolveRetryPolicy(dbmodel.ReportSchedule{
		IsRetry:       0,
		RetryTimes:    5,
		RetryInterval: -1,
	})
	assert.Equal(t, 1, maxAttempts)
	assert.Equal(t, 0, retryInterval)
}

func TestSleepRetry(t *testing.T) {
	called := false
	var got time.Duration
	svc := &Service{
		sleep: func(d time.Duration) {
			called = true
			got = d
		},
	}
	svc.sleepRetry(2)
	assert.True(t, called)
	assert.Equal(t, 2*time.Second, got)

	called = false
	svc.sleepRetry(0)
	assert.False(t, called)
}

func TestPlaceholderStages(t *testing.T) {
	report := dbmodel.Report{
		Name:          "test",
		Desc:          "支付业务核心指标日报",
		Status:        dbmodel.ReportStatusEnabled,
		QueryMode:     dbmodel.ReportQueryModeSQL,
		QueryText:     "select 1",
		BuilderConfig: `{"instanceId":1,"database":"logger","table":"orders","timeField":"event_time","timeRange":"1d","where":"1=1","metrics":[{"key":"count","label":"总量"}]}`,
		TemplateKey:   "daily-core-kpi",
		OutputFormat:  dbmodel.ReportOutputFormatMarkdown,
	}
	schedule := dbmodel.ReportSchedule{
		Status:     dbmodel.ReportScheduleStatusEnabled,
		ChannelIDs: []int{201},
		Cron:       "0 * * * * *",
	}
	queryRows := []map[string]interface{}{
		{"app": "api", "count": 3},
		{"app": "worker", "count": 2},
	}
	_, content, err := runRenderStage(report, schedule, time.Unix(0, 0), queryRows, reportQuerySourceAggregation)
	assert.NoError(t, err)
	assert.Contains(t, content, "## test")
	assert.Contains(t, content, "### 📊 核心概览")
	assert.Contains(t, content, "支付业务核心指标日报")
	assert.Contains(t, content, "logger.orders")
	assert.Contains(t, content, "昨天")
	assert.Contains(t, content, "logger.orders")
	assert.Contains(t, content, "全部数据")
	assert.Contains(t, content, "### ⏱️ 执行信息")
	assert.Contains(t, content, "### ℹ️ 查询来源")
	assert.Contains(t, content, "当前模式：聚合表")
	assert.Contains(t, content, "统计窗口：1969-12-31 00:00:00 ~ 1970-01-01 00:00:00")
	assert.Contains(t, content, "### 📋 查询结果")
	assert.Contains(t, content, "- app：api")
	assert.Contains(t, content, "- count：3")
	assert.NotContains(t, content, "1=1")
	assert.NotContains(t, content, "关键字：统计")
	assert.NotContains(t, content, "查询预览")

	report.TemplateKey = "simulate_render_error_template"
	_, _, err = runRenderStage(report, schedule, time.Unix(0, 0), queryRows, reportQuerySourceDirect)
	assert.ErrorContains(t, err, "simulate_render_error")
}

func TestRunRenderStageShowsFallbackSourceLabel(t *testing.T) {
	report := dbmodel.Report{
		Name:         "test",
		Status:       dbmodel.ReportStatusEnabled,
		QueryMode:    dbmodel.ReportQueryModeSQL,
		QueryText:    "select 1",
		TemplateKey:  "daily-core-kpi",
		OutputFormat: dbmodel.ReportOutputFormatMarkdown,
	}
	schedule := dbmodel.ReportSchedule{
		Status:     dbmodel.ReportScheduleStatusEnabled,
		ChannelIDs: []int{201},
	}

	_, content, err := runRenderStage(report, schedule, time.Unix(0, 0), nil, reportQuerySourceDirectFallback)
	assert.NoError(t, err)
	assert.Contains(t, content, "当前模式：源表直查（降级）")
}

func TestRenderQueryRowsAsMarkdown(t *testing.T) {
	md := renderQueryRowsAsMarkdown([]map[string]interface{}{
		{
			"ratio_vs_yesterday": "0.25",
			"previous_value":     4,
			"metric_name":        "总量",
			"current_value":      5,
			"message":            "hello|world",
			"metric_kind":        "aggregate",
			"top_key":            nil,
			"top_value":          nil,
		},
	})
	assert.Contains(t, md, "### 📋 查询结果")
	assert.Contains(t, md, "∘ 总量：当前 5，昨日 4，环比 🔴 25.00%，message：hello\\|world")
	assert.NotContains(t, md, "metric_kind")
	assert.NotContains(t, md, "分组值")
	assert.NotContains(t, md, "数值")

	assert.Contains(t, renderQueryRowsAsMarkdown(nil), "无数据")
}

func TestRenderQueryRowsAsMarkdownGroupsByBlockLabel(t *testing.T) {
	md := renderQueryRowsAsMarkdown([]map[string]interface{}{
		{
			"block_label":        "Debug 日志",
			"metric_name":        "总量",
			"current_value":      10,
			"previous_value":     20,
			"ratio_vs_yesterday": -0.5,
		},
		{
			"block_label":        "Info 日志",
			"metric_name":        "平均耗时",
			"current_value":      30,
			"previous_value":     20,
			"ratio_vs_yesterday": 0.5,
		},
		{
			"block_label":        "Debug 日志",
			"metric_name":        "去重 Pod 数",
			"current_value":      5,
			"previous_value":     5,
			"ratio_vs_yesterday": 0.0,
		},
	})

	assert.Contains(t, md, "#### Debug 日志")
	assert.Contains(t, md, "#### Info 日志")
	assert.Contains(t, md, "∘ 总量：当前 10，昨日 20，环比 🟢 -50.00%")
	assert.Contains(t, md, "∘ 平均耗时：当前 30，昨日 20，环比 🔴 50.00%")
	assert.Contains(t, md, "∘ 去重 Pod 数：当前 5，昨日 5，环比 🟡 0.00%")
	assert.NotContains(t, md, "block_label")
	assert.NotContains(t, md, "block_key")
	assert.True(t, strings.Index(md, "#### Debug 日志") < strings.Index(md, "#### Info 日志"))
	assert.True(t, strings.Index(md, "#### Debug 日志") < strings.Index(md, "去重 Pod 数"))
	assert.True(t, strings.Index(md, "总量") < strings.Index(md, "去重 Pod 数"))
}

func TestRenderQueryRowsAsMarkdownSupportsTopNMetric(t *testing.T) {
	md := renderQueryRowsAsMarkdown([]map[string]interface{}{
		{
			"block_key":   "error",
			"block_label": "Pod 报错统计",
			"metric_kind": "topn",
			"metric_name": "Top3 Pod",
			"item_order":  1,
			"top_key":     "pod-a",
			"top_value":   12,
		},
		{
			"block_key":   "error",
			"block_label": "Pod 报错统计",
			"metric_kind": "topn",
			"metric_name": "Top3 Pod",
			"item_order":  2,
			"top_key":     "pod-b",
			"top_value":   8,
		},
		{
			"block_key":   "error",
			"block_label": "Pod 报错统计",
			"metric_kind": "topn",
			"metric_name": "Top3 Pod",
			"item_order":  3,
			"top_key":     "pod-c",
			"top_value":   5,
		},
	})

	assert.Contains(t, md, "#### Pod 报错统计")
	assert.Contains(t, md, "∘ Top3 Pod")
	assert.Contains(t, md, "1. pod-a：12")
	assert.Contains(t, md, "2. pod-b：8")
	assert.Contains(t, md, "3. pod-c：5")
}

func TestRenderQueryRowsAsMarkdownSupportsTopNMetricWithoutRank(t *testing.T) {
	md := renderQueryRowsAsMarkdown([]map[string]interface{}{
		{
			"block_key":   "error",
			"block_label": "Pod 报错统计",
			"metric_kind": "topn",
			"metric_name": "Top3 Pod",
			"top_key":     "svc-table",
			"top_value":   11880,
		},
	})

	assert.Contains(t, md, "#### Pod 报错统计")
	assert.Contains(t, md, "∘ Top3 Pod")
	assert.Contains(t, md, "• svc-table：11880")
	assert.NotContains(t, md, "-.")
}

func TestBuildStageFailureContentIncludesKeyword(t *testing.T) {
	content := buildStageFailureContent(executionStageSend, "发送阶段: timeout", time.Unix(0, 0))
	assert.Contains(t, content, "### 统计执行失败")
	assert.Contains(t, content, "关键字：统计")
}

func TestBuildPreviewPushContentUsesDescAndWholeDataLabel(t *testing.T) {
	title, content := buildPreviewPushContent(
		view.RespReportListItem{
			ID:   1001,
			Name: "前一日支付核心指标",
			Desc: "支付业务昨天核心指标统计",
		},
		view.RespReportEditorDraft{
			ReportID: 1001,
			Name:     "前一日支付核心指标",
			Desc:     "支付业务昨天核心指标统计",
			Builder: &view.ReqReportBuilder{
				Database:  "logger",
				Table:     "orders",
				TimeField: "event_time",
				TimeRange: "1d",
				Where:     "1=1",
				Metrics:   []view.ReqReportMetric{{Key: "count", Label: "总量"}},
			},
		},
		view.RespReportSchedule{Cron: "0 0 9 * * *"},
		time.Date(2026, 4, 2, 9, 30, 0, 0, time.Local),
	)
	assert.Equal(t, "统计预览｜前一日支付核心指标", title)
	assert.Contains(t, content, "## 前一日支付核心指标")
	assert.Contains(t, content, "### 📊 核心概览")
	assert.Contains(t, content, "说明：支付业务昨天核心指标统计")
	assert.Contains(t, content, "logger.orders")
	assert.Contains(t, content, "全部数据")
	assert.Contains(t, content, "昨天")
	assert.NotContains(t, content, "1=1")
}

func TestBuildPreviewPushContentFormatsStartedAtInShanghai(t *testing.T) {
	title, content := buildPreviewPushContent(
		view.RespReportListItem{
			ID:   1001,
			Name: "UTC 时间回归测试",
			Desc: "校验报表展示时区",
		},
		view.RespReportEditorDraft{
			ReportID: 1001,
			Name:     "UTC 时间回归测试",
			Desc:     "校验报表展示时区",
			Builder: &view.ReqReportBuilder{
				Database:  "logger",
				Table:     "orders",
				TimeField: "event_time",
				TimeRange: "1h",
				Where:     "",
			},
		},
		view.RespReportSchedule{Cron: "0 0 9 * * *"},
		time.Date(2026, 4, 9, 2, 17, 18, 0, time.UTC),
	)
	assert.Equal(t, "统计预览｜UTC 时间回归测试", title)
	assert.Contains(t, content, "发送时间：2026-04-09 10:17:18")
	assert.Contains(t, content, "统计窗口：2026-04-09 09:17:18 ~ 2026-04-09 10:17:18")
}

func TestBuildPreviewPushContentIncludesAISummaryWhenAvailable(t *testing.T) {
	original := reportContentSummarizer
	reportContentSummarizer = summarizerFunc(func(input reportSummaryInput) (string, error) {
		return "支付业务昨日总量下降 10.95%，建议优先核对投放与转化链路。", nil
	})
	defer func() {
		reportContentSummarizer = original
	}()

	title, content := buildPreviewPushContent(
		view.RespReportListItem{Name: "前一日支付核心指标", Desc: "支付业务昨天核心指标统计"},
		view.RespReportEditorDraft{
			Name: "前一日支付核心指标",
			Desc: "支付业务昨天核心指标统计",
			Builder: &view.ReqReportBuilder{
				Database:  "logger",
				Table:     "orders",
				TimeField: "event_time",
				TimeRange: "1d",
				Where:     "",
			},
		},
		view.RespReportSchedule{},
		time.Date(2026, 4, 2, 9, 30, 0, 0, time.Local),
	)

	assert.Equal(t, "统计预览｜前一日支付核心指标", title)
	assert.Contains(t, content, "### ⚠️ 变化提示")
	assert.Contains(t, content, "支付业务昨日总量下降 10.95%")
}

func TestBuildPreviewPushContentFallsBackWhenAISummaryFails(t *testing.T) {
	original := reportContentSummarizer
	reportContentSummarizer = summarizerFunc(func(input reportSummaryInput) (string, error) {
		return "", assert.AnError
	})
	defer func() {
		reportContentSummarizer = original
	}()

	_, content := buildPreviewPushContent(
		view.RespReportListItem{Name: "前一日支付核心指标", Desc: "支付业务昨天核心指标统计"},
		view.RespReportEditorDraft{
			Name: "前一日支付核心指标",
			Desc: "支付业务昨天核心指标统计",
			Builder: &view.ReqReportBuilder{
				Database:  "logger",
				Table:     "orders",
				TimeField: "event_time",
				TimeRange: "1d",
				Where:     "1=1",
			},
		},
		view.RespReportSchedule{},
		time.Date(2026, 4, 2, 9, 30, 0, 0, time.Local),
	)

	assert.NotContains(t, content, "### ⚠️ 变化提示")
	assert.Contains(t, content, "### 📊 核心概览")
	assert.Contains(t, content, "全部数据")
	assert.NotContains(t, content, "1=1")
}

func TestBuildSummaryPromptContainsBlockLabels(t *testing.T) {
	prompt := buildSummaryPrompt(reportSummaryInput{
		ReportName:     "支付日志分级统计",
		Description:    "支付日志按级别汇总",
		Source:         "logger.logs",
		TimeRangeLabel: "最近1d",
		ScopeLabel:     "多条件汇总",
		StartedAt:      time.Date(2026, 4, 2, 9, 30, 0, 0, time.Local),
		QueryRows: []map[string]interface{}{
			{
				"block_label":        "Debug 日志",
				"metric_name":        "总量",
				"current_value":      10,
				"previous_value":     20,
				"ratio_vs_yesterday": -0.5,
			},
		},
	}, 5)

	assert.Contains(t, prompt, "Debug 日志")
	assert.Contains(t, prompt, "多条件汇总")
}
