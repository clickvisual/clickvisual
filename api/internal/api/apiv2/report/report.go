package report

import (
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	reportservice "github.com/clickvisual/clickvisual/api/internal/service/report"
)

// ConfigUpsert godoc
// @Summary      保存报表调度配置
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/configs [post]
func ConfigUpsert(c *core.Context) {
	var req view.ReqReportSchedule
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}

	resp, err := reportservice.UpsertSchedule(req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// ConfigGet godoc
// @Summary      获取报表调度配置
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/configs/{node-id} [get]
func ConfigGet(c *core.Context) {
	nodeID := cast.ToInt(c.Param("node-id"))
	resp, err := reportservice.GetSchedule(nodeID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// WorkspaceGet godoc
// @Summary      获取报表工作区
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/workspace [get]
func WorkspaceGet(c *core.Context) {
	reportID := cast.ToInt(c.Query("reportId"))
	resp, err := reportservice.GetWorkspace(reportID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// ReportList godoc
// @Summary      获取报表列表
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/list [get]
func ReportList(c *core.Context) {
	resp, err := reportservice.ListReports()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// EditorGet godoc
// @Summary      获取报表编辑配置
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/editor [get]
func EditorGet(c *core.Context) {
	reportID := cast.ToInt(c.Query("reportId"))
	resp, err := reportservice.GetEditor(reportID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// DeliveryGet godoc
// @Summary      获取报表推送摘要
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/delivery [get]
func DeliveryGet(c *core.Context) {
	reportID := cast.ToInt(c.Query("reportId"))
	resp, err := reportservice.GetDelivery(reportID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// ChannelList godoc
// @Summary      获取报表投递渠道
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/channels [get]
func ChannelList(c *core.Context) {
	resp, err := reportservice.ListChannels()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// PreviewGet godoc
// @Summary      获取报表执行预览
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/preview [get]
func PreviewGet(c *core.Context) {
	reportID := cast.ToInt(c.Query("reportId"))
	resp, err := reportservice.GetPreview(reportID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// ExecutionList godoc
// @Summary      获取报表执行历史
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/executions [get]
func ExecutionList(c *core.Context) {
	reportID := cast.ToInt(c.Query("reportId"))
	resp, err := reportservice.ListExecutions(reportID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

// PreviewRun godoc
// @Summary      执行一次报表预览
// @Tags         REPORT
// @Accept       json
// @Produce      json
// @Router       /api/v2/reports/preview-run [post]
func PreviewRun(c *core.Context) {
	var req struct {
		ReportID int `json:"reportId" form:"reportId"`
	}
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}

	resp, err := reportservice.RunPreview(req.ReportID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}
