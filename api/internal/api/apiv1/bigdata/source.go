package bigdata

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/internal/service/source"
)

// @Tags         BIGDATA
func SourceCreate(c *core.Context) {
	var req view2.ReqCreateSource
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj := &db2.BigdataSource{
		Iid:      req.Iid,
		Name:     req.Name,
		Desc:     req.Desc,
		URL:      req.URL,
		UserName: req.UserName,
		Password: req.Password,
		Typ:      req.Typ,
		Uid:      c.Uid(),
	}
	err := db2.SourceCreate(invoker.Db, obj)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataSourceCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

// @Tags         BIGDATA
func SourceUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	sourceInfo, err := db2.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(sourceInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view2.ReqUpdateSource
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

	if err := db2.SourceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataSourceUpdate, map[string]interface{}{"ups": ups})
	c.JSONOK()
}

// @Tags         BIGDATA
func SourceList(c *core.Context) {
	var req view2.ReqListSource
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
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
	res, err := db2.SourceList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func SourceDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	sourceInfo, err := db2.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(sourceInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if err = db2.SourceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataSourceDelete, map[string]interface{}{"obj": sourceInfo})
	c.JSONOK()
}

// @Tags         BIGDATA
func SourceInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db2.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
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
}

// @Tags         BIGDATA
func SourceDatabaseList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	s, err := db2.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "SourceInfo", err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
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
}

// @Tags         BIGDATA
func SourceTableList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view2.ReqListSourceTable
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "Bind", err)
		return
	}
	s, err := db2.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "SourceInfo", err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
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
}

// @Tags         BIGDATA
func SourceColumnList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view2.ReqListSourceColumn
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	s, err := db2.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "SourceInfo", err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
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
}
