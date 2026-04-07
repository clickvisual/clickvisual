package report

import (
	"strings"
	"testing"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
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
		Cron:       "0 * * * * *",
	}
	queryRows := []map[string]interface{}{
		{"app": "api", "count": 3},
		{"app": "worker", "count": 2},
	}
	_, content, err := runRenderStage(report, schedule, time.Unix(0, 0), queryRows)
	assert.NoError(t, err)
	assert.Contains(t, content, "### 查询结果")
	assert.Contains(t, content, "- app：api")
	assert.Contains(t, content, "- count：3")
	assert.NotContains(t, content, "关键字：统计")
	assert.NotContains(t, content, "查询预览")

	report.TemplateKey = "simulate_render_error_template"
	_, _, err = runRenderStage(report, schedule, time.Unix(0, 0), queryRows)
	assert.ErrorContains(t, err, "simulate_render_error")
}

func TestRenderQueryRowsAsMarkdown(t *testing.T) {
	md := renderQueryRowsAsMarkdown([]map[string]interface{}{
		{
			"ratio_vs_yesterday": "0.25",
			"previous_value":     4,
			"metric_name":        "总量",
			"current_value":      5,
			"message":            "hello|world",
		},
	})
	assert.Contains(t, md, "### 查询结果")
	assert.Contains(t, md, "- 指标：总量")
	assert.Contains(t, md, "- 当前值：5")
	assert.Contains(t, md, "- 昨日同期：4")
	assert.Contains(t, md, "- 环比：25.00%")
	assert.Contains(t, md, "- message：hello\\|world")
	assert.True(t, strings.Index(md, "- 指标：总量") < strings.Index(md, "- 当前值：5"))
	assert.True(t, strings.Index(md, "- 当前值：5") < strings.Index(md, "- 昨日同期：4"))
	assert.True(t, strings.Index(md, "- 昨日同期：4") < strings.Index(md, "- 环比：25.00%"))

	assert.Contains(t, renderQueryRowsAsMarkdown(nil), "无数据")
}

func TestBuildStageFailureContentIncludesKeyword(t *testing.T) {
	content := buildStageFailureContent(executionStageSend, "发送阶段: timeout", time.Unix(0, 0))
	assert.Contains(t, content, "### 统计执行失败")
	assert.Contains(t, content, "关键字：统计")
}
