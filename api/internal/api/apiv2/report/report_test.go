package report

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
	reportservice "github.com/clickvisual/clickvisual/api/internal/service/report"
)

func TestReportConfigSaveAndGet(t *testing.T) {
	reportservice.ResetForTest()

	save := gintest.Init()
	save.POST(core.Handle(ConfigUpsert), func(m *gintest.Mock) error {
		body := m.Exec(
			gintest.WithUri("/reports/configs"),
			gintest.WithJsonBody(view.ReqReportSchedule{
				NodeID:        1001,
				Desc:          "这段描述不应再由 configs 写入",
				DutyUID:       99999,
				Cron:          "0 0 9 * * *",
				Typ:           0,
				ChannelIDs:    []int{201},
				IsRetry:       1,
				RetryTimes:    2,
				RetryInterval: 300,
			}),
		)
		assert.Contains(t, string(body), `"nodeId":1001`)
		assert.Contains(t, string(body), `"cron":"0 0 9 * * *"`)
		assert.Contains(t, string(body), `"channelIds":[201]`)
		assert.NotContains(t, string(body), `"dutyUid":99999`)
		assert.NotContains(t, string(body), `"desc":"这段描述不应再由 configs 写入"`)
		return nil
	}, gintest.WithRoutePath("/reports/configs"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = save.Run()

	get := gintest.Init()
	get.GET(core.Handle(ConfigGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/configs/1001"))
		assert.Contains(t, string(body), `"nodeId":1001`)
		assert.Contains(t, string(body), `"cron":"0 0 9 * * *"`)
		assert.Contains(t, string(body), `"channelIds":[201]`)
		return nil
	}, gintest.WithRoutePath("/reports/configs/:node-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = get.Run()
}

func TestReportConfigReturnsValidationErrorWhenChannelMissing(t *testing.T) {
	reportservice.ResetForTest()

	obj := gintest.Init()
	obj.POST(core.Handle(ConfigUpsert), func(m *gintest.Mock) error {
		body := m.Exec(
			gintest.WithUri("/reports/configs"),
			gintest.WithJsonBody(view.ReqReportSchedule{
				NodeID:        31002,
				Desc:          "异常周报任务",
				DutyUID:       10010,
				Cron:          "0 0 10 * * 1",
				Typ:           1,
				ChannelIDs:    []int{},
				IsRetry:       0,
				RetryTimes:    0,
				RetryInterval: 0,
			}),
		)
		assert.JSONEq(t, `{"code":1,"msg":"channelIds 不能为空","data":null}`, string(body))
		return nil
	}, gintest.WithRoutePath("/reports/configs"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = obj.Run()
}

func TestReportWorkspaceGet(t *testing.T) {
	reportservice.ResetForTest()
	assert.NoError(t, reportservice.StartScheduler())
	defer reportservice.StopScheduler()

	obj := gintest.Init()
	obj.GET(core.Handle(WorkspaceGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/workspace?reportId=1002"))
		assert.Contains(t, string(body), `"activeReportId":1002`)
		assert.Contains(t, string(body), `"name":"周报-异常波动追踪"`)
		assert.Contains(t, string(body), `"queryMode":"dsl"`)
		assert.Contains(t, string(body), `"cron":"0 0 10 * * 1"`)
		assert.Contains(t, string(body), `"runtime":{"registered":false,"paused":true`)
		assert.Contains(t, string(body), `"lastScheduledExecution":{"status":"unknown","trigger":"schedule"`)
		return nil
	}, gintest.WithRoutePath("/reports/workspace"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = obj.Run()
}

func TestReportListEditorAndDelivery(t *testing.T) {
	reportservice.ResetForTest()

	listObj := gintest.Init()
	listObj.GET(core.Handle(ReportList), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/list"))
		assert.Contains(t, string(body), `"name":"日报-核心指标概览"`)
		assert.Contains(t, string(body), `"status":"enabled"`)
		return nil
	}, gintest.WithRoutePath("/reports/list"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = listObj.Run()

	editorObj := gintest.Init()
	editorObj.GET(core.Handle(EditorGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/editor?reportId=1002"))
		assert.Contains(t, string(body), `"queryMode":"dsl"`)
		assert.Contains(t, string(body), `"outputFormat":"image"`)
		return nil
	}, gintest.WithRoutePath("/reports/editor"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = editorObj.Run()

	deliveryObj := gintest.Init()
	deliveryObj.GET(core.Handle(DeliveryGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/delivery?reportId=1001"))
		assert.Contains(t, string(body), `"success":4`)
		assert.Contains(t, string(body), `"channelTyp":"dingtalk"`)
		return nil
	}, gintest.WithRoutePath("/reports/delivery"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = deliveryObj.Run()
}

func TestReportChannelList(t *testing.T) {
	reportservice.ResetForTest()

	obj := gintest.Init()
	obj.GET(core.Handle(ChannelList), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/channels"))
		assert.Contains(t, string(body), `"key":"ops-dingtalk"`)
		assert.Contains(t, string(body), `"typ":"dingtalk"`)
		return nil
	}, gintest.WithRoutePath("/reports/channels"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = obj.Run()
}

func TestReportPreviewAndExecutions(t *testing.T) {
	reportservice.ResetForTest()

	preview := gintest.Init()
	preview.GET(core.Handle(PreviewGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/preview?reportId=1001"))
		assert.Contains(t, string(body), `"reportId":1001`)
		assert.Contains(t, string(body), `"canRun":true`)
		return nil
	}, gintest.WithRoutePath("/reports/preview"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = preview.Run()

	execList := gintest.Init()
	execList.GET(core.Handle(ExecutionList), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/executions?reportId=1001"))
		assert.Contains(t, string(body), `"trigger":"schedule"`)
		assert.Contains(t, string(body), `"status":"success"`)
		return nil
	}, gintest.WithRoutePath("/reports/executions"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = execList.Run()
}

func TestReportPreviewRun(t *testing.T) {
	reportservice.ResetForTest()

	obj := gintest.Init()
	obj.POST(core.Handle(PreviewRun), func(m *gintest.Mock) error {
		body := m.Exec(
			gintest.WithUri("/reports/preview-run"),
			gintest.WithJsonBody(map[string]int{"reportId": 1001}),
		)
		assert.Contains(t, string(body), `"message":"本次手动预览已完成，1 个渠道推送成功。"`)
		assert.Contains(t, string(body), `"trigger":"manual"`)
		assert.Contains(t, string(body), `"operatorName":"clickvisual"`)
		assert.Contains(t, string(body), `"delivery"`)
		return nil
	}, gintest.WithRoutePath("/reports/preview-run"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = obj.Run()
}

func TestReportDefinitionUpsertAndGet(t *testing.T) {
	reportservice.ResetForTest()

	upsert := gintest.Init()
	upsert.POST(core.Handle(ReportUpsert), func(m *gintest.Mock) error {
		body := m.Exec(
			gintest.WithUri("/reports"),
			gintest.WithJsonBody(view.ReqReportDefinition{
				ReportID:     1001,
				Name:         "日报-核心指标概览-v2",
				Desc:         "定义接口更新描述",
				Status:       "enabled",
				QueryMode:    "sql",
				QueryText:    "select 1",
				TemplateKey:  "daily-core-kpi",
				OutputFormat: "markdown",
				DutyUID:      10086,
			}),
		)
		assert.Contains(t, string(body), `"reportId":1001`)
		assert.Contains(t, string(body), `"name":"日报-核心指标概览-v2"`)
		assert.Contains(t, string(body), `"queryText":"select 1"`)
		return nil
	}, gintest.WithRoutePath("/reports"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = upsert.Run()

	get := gintest.Init()
	get.GET(core.Handle(ReportGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/1001"))
		assert.Contains(t, string(body), `"reportId":1001`)
		assert.Contains(t, string(body), `"name":"日报-核心指标概览-v2"`)
		assert.Contains(t, string(body), `"queryText":"select 1"`)
		return nil
	}, gintest.WithRoutePath("/reports/:report-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = get.Run()
}

func TestReportUpsertBuildsSQLFromBuilderPayload(t *testing.T) {
	reportservice.ResetForTest()

	obj := gintest.Init()
	obj.POST(core.Handle(ReportUpsert), func(m *gintest.Mock) error {
		body := m.Exec(
			gintest.WithUri("/reports"),
			gintest.WithJsonBody(map[string]interface{}{
				"name": "错误日志小时报",
				"builder": map[string]interface{}{
					"instanceId": 1,
					"database":   "default",
					"table":      "logs",
					"timeField":  "event_time",
					"timeRange":  "1h",
					"where":      "level = 'error'",
					"metrics": []map[string]string{
						{"key": "count", "label": "总量"},
						{"key": "custom", "label": "去重 Trace", "expression": "uniq(trace_id)"},
					},
				},
			}),
		)
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"queryMode":"sql"`)
		assert.Contains(t, string(body), `"queryText":"WITH`)
		return nil
	}, gintest.WithRoutePath("/reports"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = obj.Run()
}

func TestReportTableColumns(t *testing.T) {
	reportservice.ResetForTest()

	obj := gintest.Init()
	obj.GET(core.Handle(ReportTableColumns), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/instances/1/databases/default/tables/logs/columns"))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"field":"event_time"`)
		return nil
	}, gintest.WithRoutePath("/reports/instances/:instance-id/databases/:database/tables/:table/columns"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = obj.Run()
}

func TestReportSourceMetadata(t *testing.T) {
	reportservice.ResetForTest()

	instances := gintest.Init()
	instances.GET(core.Handle(ReportSourceInstances), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/instances"))
		assert.Contains(t, string(body), `"name":"生产 ClickHouse"`)
		return nil
	}, gintest.WithRoutePath("/reports/instances"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = instances.Run()

	databases := gintest.Init()
	databases.GET(core.Handle(ReportSourceDatabases), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/instances/1/databases"))
		assert.Contains(t, string(body), `"name":"default"`)
		return nil
	}, gintest.WithRoutePath("/reports/instances/:instance-id/databases"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = databases.Run()

	tables := gintest.Init()
	tables.GET(core.Handle(ReportSourceTables), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/instances/1/databases/default/tables"))
		assert.Contains(t, string(body), `"name":"logs"`)
		return nil
	}, gintest.WithRoutePath("/reports/instances/:instance-id/databases/:database/tables"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = tables.Run()
}
