package setting

import (
	"github.com/gotomicro/ego-component/egorm"

	"github.com/shimohq/mogo/api/pkg/component/core"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func IndexUpdate(c *core.Context) {
	var (
		req view.ReqCreateIndex
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "参数错误:"+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	err = db.IndexDeleteBatch(tx, req.InstanceID, req.Database, req.Table)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "历史数据删除失败 DB: "+err.Error(), nil)
		return
	}
	for _, d := range req.Data {
		err = db.IndexCreate(tx, &db.Index{
			InstanceID: req.InstanceID,
			Database:   req.Database,
			Table:      req.Table,
			Field:      d.Field,
			Typ:        d.Typ,
			Alias:      d.Alias,
		})
		if err != nil {
			tx.Rollback()
			c.JSONE(1, err.Error(), nil)
			return
		}
	}
	tx.Commit()
	c.JSONOK()
}

func Indexes(c *core.Context) {
	var (
		req view.ReqCreateIndex
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "参数错误:"+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["instance_id"] = req.InstanceID
	conds["database"] = req.Database
	conds["table"] = req.Table
	indexes, err := db.IndexList(conds)
	if err != nil {
		c.JSONE(1, "索引查询失败: "+err.Error(), nil)
		return
	}
	c.JSONOK(indexes)
}
