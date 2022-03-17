package base

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func DatabaseCreate(c *core.Context) {
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
		Iid:  iid,
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

func DatabaseExistList(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res, err := op.Databases()
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func DatabaseList(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	conds := egorm.Conds{}
	if iid != 0 {
		conds["iid"] = iid
	}
	dl, err := db.DatabaseList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res := make([]view.RespDatabaseItem, 0)
	for _, row := range dl {
		tmp := view.RespDatabaseItem{
			Id:   row.ID,
			Iid:  row.Iid,
			Name: row.Name,
			Uid:  row.Uid,
		}
		if row.Instance != nil {
			tmp.DatasourceType = row.Instance.Datasource
			tmp.InstanceName = row.Instance.Name
		}
		res = append(res, tmp)

	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func DatabaseDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	conds := egorm.Conds{}
	conds["did"] = id
	tables, err := db.TableList(invoker.Db, conds)
	if len(tables) > 0 {
		c.JSONE(1, "you should delete all tables before delete database", nil)
		return
	}
	database, err := db.DatabaseInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete database: "+err.Error(), nil)
		return
	}
	op, err := service.InstanceManager.Load(database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	err = op.DropDatabase(database.Name)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	err = db.DatabaseDelete(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete database, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}
