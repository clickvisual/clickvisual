package bigdata

import (
	"strconv"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/internal/service/source"
)

// @Tags         BIGDATA
func InstanceDatabaseList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission error", err)
		return
	}
	s, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "instance info error", err)
		return
	}
	res, err := source.Instantiate(&source.Source{
		DSN: s.GetDSN(),
		Typ: db2.SourceTypClickHouse,
	}).Databases()
	if err != nil {
		c.JSONE(1, "database list query failed", err)
		return
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func InstanceTableList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view2.ReqListSourceTable
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "Bind", err)
		return
	}
	s, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "InstanceInfo", err)
		return
	}
	res, err := source.Instantiate(&source.Source{
		DSN: s.GetDSN(),
		Typ: db2.SourceTypClickHouse,
	}).Tables(req.Database)
	if err != nil {
		c.JSONE(1, "table list query failed", err)
		return
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func InstanceColumnList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "CheckNormalPermission", err)
		return
	}
	var req view2.ReqListSourceColumn
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	s, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "InstanceInfo", err)
		return
	}
	res, err := source.Instantiate(&source.Source{
		DSN: s.GetDSN(),
		Typ: db2.SourceTypClickHouse,
	}).Columns(req.Database, req.Table)
	if err != nil {
		c.JSONE(1, "columns list query failed", err)
		return
	}
	c.JSONOK(res)
}
