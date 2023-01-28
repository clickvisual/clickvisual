package bigdata

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/source"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// @Tags         BIGDATA
func SourceCreate(c *core.Context) {
	var req view.ReqCreateSource
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj := &db.BigdataSource{
		Iid:      req.Iid,
		Name:     req.Name,
		Desc:     req.Desc,
		URL:      req.URL,
		UserName: req.UserName,
		Password: req.Password,
		Typ:      req.Typ,
		Uid:      c.Uid(),
	}
	err := db.SourceCreate(invoker.Db, obj)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataSourceCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
	return
}

// @Tags         BIGDATA
func SourceUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	sourceInfo, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(sourceInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view.ReqUpdateSource
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["typ"] = req.Typ
	ups["url"] = req.URL
	ups["uid"] = c.Uid()
	ups["name"] = req.Name
	ups["desc"] = req.Desc
	ups["username"] = req.UserName
	ups["password"] = req.Password

	if err := db.SourceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataSourceUpdate, map[string]interface{}{"ups": ups})
	c.JSONOK()
}

// @Tags         BIGDATA
func SourceList(c *core.Context) {
	var req view.ReqListSource
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	conds := egorm.Conds{}
	conds["iid"] = req.Iid
	if req.Typ != 0 {
		conds["typ"] = req.Typ
	}
	if req.Name != "" {
		conds["name"] = egorm.Cond{
			Op:  "like",
			Val: req.Name,
		}
	}
	res, err := db.SourceList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

// @Tags         BIGDATA
func SourceDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	sourceInfo, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(sourceInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if err = db.SourceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataSourceDelete, map[string]interface{}{"obj": sourceInfo})
	c.JSONOK()
	return
}

// @Tags         BIGDATA
func SourceInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(res.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	c.JSONOK(res)
	return
}

// @Tags         BIGDATA
func SourceDatabaseList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	s, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "SourceInfo", err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(s.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	res, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Databases()
	if err != nil {
		c.JSONE(1, "database list query failed", err)
		return
	}
	c.JSONOK(res)
	return
}

// @Tags         BIGDATA
func SourceTableList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqListSourceTable
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "Bind", err)
		return
	}
	s, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "SourceInfo", err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(s.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	res, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Tables(req.Database)
	if err != nil {
		c.JSONE(1, "table list query failed", err)
		return
	}
	c.JSONOK(res)
	return
}

// @Tags         BIGDATA
func SourceColumnList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqListSourceColumn
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	s, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "SourceInfo", err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(s.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	res, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Columns(req.Database, req.Table)
	if err != nil {
		c.JSONE(1, "column list query failed", err)
		return
	}
	c.JSONOK(res)
	return
}
