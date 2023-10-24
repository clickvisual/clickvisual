package storage

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
)

// CreateCollect godoc
// @Summary      Create Collect
// @Description  CollectType
// @Tags         LOGSTORE
// @Produce      json
// @Param        req body db.ReqCreateCollect true "params"
// @Success      200 {object} core.Res{data=db.ReqCreateCollect}
// @Router       /api/v2/storage/collects [post]
func CreateCollect(c *core.Context) {
	params := db2.ReqCreateCollect{}
	err := c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	m := db2.Collect{
		Uid:         c.Uid(),
		TableId:     params.TableId,
		Alias:       params.Alias,
		Statement:   params.Statement,
		CollectType: params.CollectType,
	}
	if err = m.Create(invoker.Db); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK(m)
}

// UpdateCollect  godoc
// @Summary	     Update collect
// @Description  Update collect
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Param        collect-id path int true "collect id"
// @Param        req query db.ReqCreateCollect true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/storage/collects/{collect-id} [patch]
func UpdateCollect(c *core.Context) {
	id := cast.ToInt(c.Param("collect-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req db2.ReqUpdateCollect
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	currentCollect := db2.Collect{}
	currentCollect.ID = id
	if err := currentCollect.Info(invoker.Db); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	if currentCollect.Uid != c.Uid() {
		c.JSONE(1, db2.ErrCollectCreator.Error(), db2.ErrCollectCreator)
		return
	}
	// just mysql record update
	ups := make(map[string]interface{}, 0)

	if req.CollectType != 0 && req.Alias == "" && req.Statement == "" {
		ups["collect_type"] = req.CollectType
	} else if req.CollectType == 0 && (req.Alias != "" || req.Statement != "") {
		ups["alias"] = req.Alias
		ups["statement"] = req.Statement
	} else {
		c.JSONE(1, db2.ErrCollectUpdateParams.Error(), db2.ErrCollectUpdateParams)
		return
	}

	m := db2.Collect{}
	m.ID = id
	if err := m.Update(invoker.Db, ups); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// ListCollect  godoc
// @Summary      List Collect
// @Description  List Collect
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Param        req query db.ReqListCollect true "params"
// @Success      200 {object} core.Res{data=db.RespListCollect}
// @Router       /api/v2/storage/collects [get]
func ListCollect(c *core.Context) {
	var req db2.ReqListCollect
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "request parameter error: "+err.Error(), nil)
		return
	}
	if req.CollectType&db2.CollectTypeQuery == db2.CollectTypeQuery {
		conds := egorm.Conds{}
		conds["uid"] = c.Uid()
		conds["collect_type"] = db2.CollectTypeQuery
		m := db2.Collect{}
		list, err := m.List(invoker.Db, conds)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
		c.JSONOK(list)
		return
	}
	resp := make([]*db2.Collect, 0)
	if req.CollectType&db2.CollectTypeTableFilter == db2.CollectTypeTableFilter {
		conds := egorm.Conds{}
		conds["uid"] = c.Uid()
		conds["table_id"] = req.TableId
		conds["collect_type"] = db2.CollectTypeTableFilter
		m := db2.Collect{}
		tmp, err := m.List(invoker.Db, conds)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
		resp = append(resp, tmp...)
	}
	if req.CollectType&db2.CollectTypeGlobalFilter == db2.CollectTypeGlobalFilter {
		conds := egorm.Conds{}
		conds["uid"] = c.Uid()
		conds["collect_type"] = db2.CollectTypeGlobalFilter
		m := db2.Collect{}
		tmp, err := m.List(invoker.Db, conds)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
		resp = append(resp, tmp...)
	}
	c.JSONOK(resp)
}

// DeleteCollect godoc
// @Summary      Delete Collect
// @Description  Delete Collect
// @Tags         LOGSTORE
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
	currentCollect := db2.Collect{}
	currentCollect.ID = id
	if err := currentCollect.Info(invoker.Db); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	if currentCollect.Uid != c.Uid() {
		c.JSONE(1, db2.ErrCollectCreator.Error(), db2.ErrCollectCreator)
		return
	}
	m := db2.Collect{}
	m.ID = id
	if err := m.Delete(invoker.Db); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}
