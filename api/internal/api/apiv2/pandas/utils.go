package pandas

import (
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// StructuralTransfer  godoc
// @Summary	     Data field mapping transformation
// @Description  source: mysql
// @Description  target: clickhouse
// @Tags         PANDAS
// @Accept       json
// @Produce      json
// @Param        req body view.ReqStructuralTransfer{} true "params"
// @Success      200 {object} core.Res{data=string}
// @Router       /api/v2/pandas/utils/structural-transfer [post]
func StructuralTransfer(c *core.Context) {
	var req view.ReqStructuralTransfer
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if req.Source != "mysql" || req.Target != "clickhouse" {
		c.JSONE(1, "invalid source/target", nil)
		return
	}
	c.JSONOK(service.StructuralTransfer(req.Columns))
	return
}
