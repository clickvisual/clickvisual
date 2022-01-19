package setting

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"

	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func IndexUpdate(c *core.Context) {
	var (
		req    view.ReqCreateIndex
		addMap map[string]*db.Index
		delMap map[string]*db.Index
		newMap map[string]*db.Index
		err    error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "param error:"+err.Error(), nil)
		return
	}
	addMap, delMap, newMap, err = service.Index.Diff(req)
	if err != nil {
		c.JSONE(1, "unknown error:"+err.Error(), nil)
		return
	}
	elog.Debug("IndexUpdate", elog.Any("addMap", addMap), elog.Any("delMap", delMap))

	// Prefer clickhouse operation
	// Alert Delete or Create
	// Drop View
	// Create View
	err = service.Index.Sync(req, addMap, delMap, newMap)
	if err != nil {
		c.JSONE(1, "unknown error:"+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func Indexes(c *core.Context) {
	var (
		req view.ReqCreateIndex
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "param error:"+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["instance_id"] = req.InstanceID
	conds["database"] = req.Database
	conds["table"] = req.Table
	indexes, err := db.IndexList(conds)
	if err != nil {
		c.JSONE(1, "unknown error: "+err.Error(), nil)
		return
	}
	c.JSONOK(indexes)
}
