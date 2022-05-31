package template

import (
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/template"
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
	var templateObj template.IMP
	switch id {
	case 1:
		var req view.ReqTemplateStandalone
		err := c.Bind(&req)
		if err != nil {
			invoker.Logger.Error("GenBind", elog.Any("req", req), elog.Any("err", err.Error()))
			c.JSONE(1, "invalid parameter: ", err.Error())
			return
		}
		templateObj = template.NewStandalone(req)
	case 2:
		var req view.ReqTemplateClusterNoReplica
		err := c.Bind(&req)
		if err != nil {
			invoker.Logger.Error("GenBind", elog.Any("req", req), elog.Any("err", err.Error()))
			c.JSONE(1, "invalid parameter: ", err.Error())
			return
		}
		templateObj = template.NewClusterNoReplica(req)
	default:
		c.JSONE(1, "this template is not yet supported", nil)
		return
	}
	instanceInfo, err := templateObj.CreateInstance()
	if err != nil {
		invoker.Logger.Error("CreateInstance", elog.Any("err", err.Error()))
		c.JSONE(1, "Template exec failed: ", err.Error())
		return
	}
	databaseInfo, err := templateObj.CreateDatabase(instanceInfo.ID)
	if err != nil {
		invoker.Logger.Error("CreateDatabase", elog.Any("err", err.Error()))
		c.JSONE(1, "Template exec failed: ", err.Error())
		return
	}
	err = templateObj.CreateTable(databaseInfo)
	if err != nil {
		invoker.Logger.Error("CreateTable", elog.Any("err", err.Error()))
		c.JSONE(1, "Template exec failed: ", err.Error())
		return
	}
	c.JSONOK(0)

}
