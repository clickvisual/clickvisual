package base

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// @Tags         LOGSTORE
func DatabaseCreate(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var req view.ReqDatabaseCreate
	if err := c.ShouldBind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj := db.BaseDatabase{
		Iid:          iid,
		Name:         req.Name,
		Cluster:      req.Cluster,
		Uid:          c.Uid(),
		IsCreateByCV: 1,
		Desc:         req.Desc,
	}
	if req.Type == 1 {
		obj.IsCreateByCV = 0
	}
	_, err := service.DatabaseCreate(obj)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnDatabasesCreate, map[string]interface{}{"database": obj})
	c.JSONOK()
}

// @Tags         LOGSTORE
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
	res, err := op.ListDatabase()
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
}

// @Tags         LOGSTORE
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
		if !service.DatabaseViewIsPermission(c.Uid(), row.Iid, row.ID) {
			continue
		}
		tmp := view.RespDatabaseItem{
			Id:      row.ID,
			Iid:     row.Iid,
			Name:    row.Name,
			Uid:     row.Uid,
			Desc:    row.Desc,
			Cluster: row.Cluster,
		}
		if row.Instance != nil {
			tmp.DatasourceType = row.Instance.Datasource
			tmp.InstanceName = row.Instance.Name
			tmp.Mode = row.Instance.Mode
			tmp.InstanceDesc = row.Instance.Desc
		}
		res = append(res, tmp)
	}
	c.JSONOK(res)
}

// @Tags         LOGSTORE
func DatabaseDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	database, err := db.DatabaseInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete database: "+err.Error(), err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActDelete},
		DomainType:  pmsplugin.PrefixDatabase,
		DomainId:    strconv.Itoa(database.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	conds := egorm.Conds{}
	conds["did"] = id
	tables, _ := db.TableList(invoker.Db, conds)
	if len(tables) > 0 {
		c.JSONE(1, "you should delete all tables before delete database", errors.Wrap(constx.ErrEmptyData, ""))
		return
	}
	if database.IsCreateByCV == 1 {
		op, errLoad := service.InstanceManager.Load(database.Iid)
		if errLoad != nil {
			c.JSONE(core.CodeErr, errLoad.Error(), err)
			return
		}
		err = op.DeleteDatabase(database.Name, database.Cluster)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
	}
	err = db.DatabaseDelete(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete database, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnDatabasesDelete, map[string]interface{}{"database": database})
	c.JSONOK()
}

// @Tags         LOGSTORE
func DatabaseUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view.ReqDatabaseCreate
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	database, err := db.DatabaseInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to update database: "+err.Error(), err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixDatabase,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["desc"] = req.Desc
	ups["cluster"] = req.Cluster
	if err = db.DatabaseUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed 01"+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnDatabasesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}
