package base

import (
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

// InstanceList  godoc
// @Summary      table info
// @Description  gets all instances, databases, and table nested data
// @Tags         search
// @Produce      json
// @Success      200  {object}  []view.RespInstanceSimple{}
// @Router       /api/v2/base/instances [get]
func InstanceList(c *core.Context) {
	res, err := service.InstanceFilterPms(c.Uid())
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
