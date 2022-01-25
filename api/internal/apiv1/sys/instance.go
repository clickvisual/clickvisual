package sys

import (
	"strings"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/pkg/component/core"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func InstanceCreate(c *core.Context) {
	var req view.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["datasource"] = req.Datasource
	conds["name"] = req.Name
	checks, err := db.InstanceList(conds)
	if err != nil {
		c.JSONE(1, "creation DB failed: "+err.Error(), nil)
		return
	}
	if len(checks) > 0 {
		c.JSONE(1, "data source configuration with duplicate name", nil)
		return
	}
	obj := db.Instance{
		Datasource: req.Datasource,
		Name:       req.Name,
		Dsn:        strings.TrimSpace(req.Dsn),
	}
	if err = db.InstanceCreate(invoker.Db, &obj); err != nil {
		c.JSONE(1, "creation DB failed: "+err.Error(), nil)
		return
	}
	if err = service.InstanceManager.Add(&obj); err != nil {
		c.JSONE(1, "DNS configuration exception, database connection failure: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func InstanceUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	objBef, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	service.InstanceManager.Delete(objBef.DsKey())
	objUpdate := db.Instance{
		Datasource: req.Datasource,
		Name:       req.Name,
		Dsn:        req.Dsn,
	}
	objUpdate.ID = id
	if err = service.InstanceManager.Add(&objUpdate); err != nil {
		_ = service.InstanceManager.Add(&objBef)
		c.JSONE(1, "DNS configuration exception, database connection failure: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["datasource"] = req.Datasource
	ups["name"] = req.Name
	ups["dsn"] = req.Dsn
	if err = db.InstanceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func InstanceList(c *core.Context) {
	res, err := db.InstanceList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func InstanceDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	obj, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	if err = db.InstanceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	service.InstanceManager.Delete(obj.DsKey())
	c.JSONOK()
}
