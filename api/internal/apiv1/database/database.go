package database

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func Create(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var req view.ReqDatabaseCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	obj := db.Database{
		Name: req.Name,
		Uid:  c.Uid(),
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	err = op.DatabaseCreate(req.Name)
	if err != nil {
		c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
		return
	}
	if err = db.DatabaseCreate(invoker.Db, &obj); err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func List(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	conds := egorm.Conds{}
	conds["iid"] = iid
	res, err := db.DatabaseList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func Delete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	err := db.DatabaseDelete(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}
