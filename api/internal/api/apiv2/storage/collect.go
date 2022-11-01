package storage

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

// CreateCollect godoc
// @Summary      Create Collect
// @Description  Create Collect
// @Tags         storage
// @Produce      json
// @Param        req body db.ReqCreateCollect true "params"
// @Success      200 {object} core.Res{data=db.ReqCreateCollect}
// @Router       /api/v2/storage/collects [post]
func CreateCollect(c *core.Context) {
	params := db.ReqCreateCollect{}
	err := c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	m := db.Collect{
		Uid:       c.Uid(),
		Alias:     params.Alias,
		Statement: params.Statement,
	}
	if err = m.Create(invoker.Db); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK(m)
}

// ListCollect  godoc
// @Summary      List Collect
// @Description  List Collect
// @Tags         storage
// @Accept       json
// @Produce      json
// @Param        req query db.ReqListCollect true "params"
// @Success      200 {object} core.Res{data=db.RespListCollect}
// @Router       /api/v2/storage/collects [get]
func ListCollect(c *core.Context) {
	var req db.ReqListCollect
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "request parameter error: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	if req.Alias != "" {
		conds["alias"] = egorm.Cond{
			Op:  "like",
			Val: req.Alias,
		}
	}
	m := db.Collect{}
	list, err := m.List(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(list)
	return
}

// DeleteCollect godoc
// @Summary      Delete Collect
// @Description  Delete Collect
// @Tags         storage
// @Accept       json
// @Produce      json
// @Param        collect-id path int true "collect id"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/storage/collects/{collect-id} [delete]
func DeleteCollect(c *core.Context) {
	id := cast.ToInt(c.Param("collect-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	m := db.Collect{}
	m.ID = id
	if err := m.Delete(invoker.Db); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}
