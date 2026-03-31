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
				NodeID:        31001,
				Desc:          "核心指标日报任务",
				DutyUID:       10086,
				Cron:          "0 0 9 * * *",
				Typ:           0,
				ChannelIDs:    []int{201},
				IsRetry:       1,
				RetryTimes:    2,
				RetryInterval: 300,
			}),
		)
		assert.JSONEq(t, `{"code":0,"msg":"succ","data":{"nodeId":31001,"desc":"核心指标日报任务","dutyUid":10086,"cron":"0 0 9 * * *","typ":0,"channelIds":[201],"isRetry":1,"retryTimes":2,"retryInterval":300}}`, string(body))
		return nil
	}, gintest.WithRoutePath("/reports/configs"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = save.Run()

	get := gintest.Init()
	get.GET(core.Handle(ConfigGet), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/reports/configs/31001"))
		assert.JSONEq(t, `{"code":0,"msg":"succ","data":{"nodeId":31001,"desc":"核心指标日报任务","dutyUid":10086,"cron":"0 0 9 * * *","typ":0,"channelIds":[201],"isRetry":1,"retryTimes":2,"retryInterval":300}}`, string(body))
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
