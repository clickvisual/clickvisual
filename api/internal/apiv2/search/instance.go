package search

import (
	"github.com/clickvisual/clickvisual/api/internal/apiv2/base"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

// InstanceList godoc
// @Summary      instance list
// @Description  gets all instances, databases, and table nested data for the log page
// @Tags         search
// @Produce      json
// @Success      200  {object}  []view.RespInstanceSimple{}
// @Router       /api/v2/search/instances [get]
func InstanceList(c *core.Context) {
	base.InstanceList(c, pmsplugin.Log)
	return
}
