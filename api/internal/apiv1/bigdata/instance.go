package bigdata

import (
	"strconv"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/source"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func InstanceDatabaseList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	s, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	res, err := source.Instantiate(&source.Source{
		DSN: s.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Databases()
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func InstanceTableList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var req view.ReqListSourceTable
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	s, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	res, err := source.Instantiate(&source.Source{
		DSN: s.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Tables(req.Database)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func InstanceColumnList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var req view.ReqListSourceColumn
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	s, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	res, err := source.Instantiate(&source.Source{
		DSN: s.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Columns(req.Database, req.Table)
	if err != nil {
		c.JSONE(1, "query error: "+err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
