package template

import (
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// Gen Determine whether the installation process is required
func Gen(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "template id error", nil)
		return
	}
	switch id {
	case 1:
		var req view.ReqTemplateOne
		err := c.Bind(&req)
		if err != nil {
			invoker.Logger.Error("GenBind", elog.Any("req", req), elog.Any("err", err.Error()))
			c.JSONE(1, "invalid parameter: ", err.Error())
			return
		}
		err = service.TemplateOne(req)
		if err != nil {
			invoker.Logger.Error("GenService", elog.Any("req", req), elog.Any("err", err.Error()))
			c.JSONE(1, "TemplateOne exec failed: ", err.Error())
			return
		}
		c.JSONOK(0)
	default:
		c.JSONE(1, "this template is not yet supported", nil)
	}
}
