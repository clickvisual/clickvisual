package bigdata

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/source"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func SourceCreate(c *core.Context) {
	var req view.ReqCreateSource
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
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
	c.JSONOK()
}

func SourceUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqUpdateSource
	if err := c.Bind(&req); err != nil {
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
	c.JSONOK()
}

func SourceList(c *core.Context) {
	var req view.ReqListSource
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["typ"] = req.Typ
	conds["iid"] = req.Iid
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
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func SourceDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := db.SourceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

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
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func SourceDatabaseList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	s, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	res, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Databases()
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func SourceTableList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqListSourceTable
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	s, err := db.SourceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	res, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Tables(req.Database)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

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
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	res, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Columns(req.Database, req.Table)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
