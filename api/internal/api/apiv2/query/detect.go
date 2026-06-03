package query

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/querydetect"
)

type DetectRequest struct {
	Samples []map[string]interface{} `json:"samples"`
}

// Detect godoc
// @Summary      识别日志样本结构
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/ingestion/detect [post]
func Detect(c *core.Context) {
	var req DetectRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := querydetect.Detect(req.Samples)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

type FieldsRequest struct {
	Samples []map[string]interface{} `json:"samples"`
	Draft   view.NormalizationDraft  `json:"draft"`
}

// Fields godoc
// @Summary      根据识别草案生成可查询字段目录
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/ingestion/fields [post]
func Fields(c *core.Context) {
	var req FieldsRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := querydetect.BuildQueryableFields(req.Samples, req.Draft, nil)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}
