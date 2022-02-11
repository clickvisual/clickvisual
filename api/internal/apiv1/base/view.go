package base

import (
	"strings"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func ViewDelete(c *core.Context) {
	var err error
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "error id", nil)
		return
	}
	tx := invoker.Db.Begin()
	var viewInfo db.View
	viewInfo, err = db.ViewInfo(tx, id)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	err = db.ViewDelete(tx, id)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewList []*db.View
	conds := egorm.Conds{}
	conds["tid"] = viewInfo.Tid
	viewList, err = db.ViewList(tx, conds)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	tableInfo, err := db.TableInfo(tx, viewInfo.Tid)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	databaseInfo, _ := db.DatabaseInfo(tx, tableInfo.Did)
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	dSQL, cQSL, err := op.ViewSync(tableInfo, &viewInfo, viewList, false)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups := make(map[string]interface{}, 0)
	ups["sql_view"] = cQSL
	err = db.ViewUpdate(tx, id, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups2 := make(map[string]interface{}, 0)
	ups2["sql_view"] = dSQL
	err = db.TableUpdate(tx, id, ups2)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK()
	return
}

func ViewCreate(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	params := view.ReqViewCreate{}
	err := c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if strings.Contains(params.Key, " ") {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	current := db.View{
		Tid:              tid,
		Name:             params.Name,
		IsUseDefaultTime: params.IsUseDefaultTime,
		Key:              params.Key,
		Format:           params.Format,
	}
	tx := invoker.Db.Begin()
	if err = db.ViewCreate(tx, &current); err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewList []*db.View
	condsView := egorm.Conds{}
	condsView["tid"] = tid
	viewList, err = db.ViewList(tx, condsView)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	tableInfo, _ := db.TableInfo(tx, tid)
	databaseInfo, _ := db.DatabaseInfo(tx, tableInfo.Did)
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	dSQL, cQSL, err := op.ViewSync(tableInfo, &current, viewList, true)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups := make(map[string]interface{}, 0)
	ups["sql_view"] = cQSL
	ups["uid"] = c.Uid()
	err = db.ViewUpdate(tx, current.ID, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups2 := make(map[string]interface{}, 0)
	ups2["sql_view"] = dSQL
	ups2["uid"] = c.Uid()
	err = db.TableUpdate(tx, tableInfo.ID, ups2)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK()
	return
}

func ViewUpdate(c *core.Context) {
	var err error
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error id", nil)
		return
	}
	params := view.ReqViewCreate{}
	err = c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	ups["is_use_default_time"] = params.IsUseDefaultTime
	ups["key"] = params.Key
	ups["format"] = params.Format
	err = db.ViewUpdate(tx, id, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewInfo db.View
	viewInfo, err = db.ViewInfo(tx, id)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewList []*db.View
	conds := egorm.Conds{}
	conds["tid"] = viewInfo.Tid
	viewList, err = db.ViewList(tx, conds)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	tableInfo, err := db.TableInfo(tx, viewInfo.Tid)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	databaseInfo, _ := db.DatabaseInfo(tx, tableInfo.Did)
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	dSQL, cQSL, err := op.ViewSync(tableInfo, &viewInfo, viewList, true)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups1 := make(map[string]interface{}, 0)
	ups1["sql_view"] = cQSL
	ups1["uid"] = c.Uid()
	err = db.ViewUpdate(tx, viewInfo.ID, ups1)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups2 := make(map[string]interface{}, 0)
	ups2["sql_view"] = dSQL
	ups2["uid"] = c.Uid()
	err = db.TableUpdate(tx, tableInfo.ID, ups2)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK()
	return
}

func ViewInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "error id", nil)
		return
	}
	info, err := db.ViewInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(info)
	return
}

func ViewList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db.TableInfo(invoker.Db, id)
	iid := tableInfo.Database.Iid
	database := tableInfo.Database.Name
	table := tableInfo.Name
	if iid == 0 || database == "" || table == "" {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	condsView := egorm.Conds{}
	condsView["tid"] = tableInfo.ID
	views, err := db.ViewList(invoker.Db, condsView)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	var res []view.ReqViewList
	res = make([]view.ReqViewList, 0)
	for _, v := range views {
		res = append(res, view.ReqViewList{
			ID:   v.ID,
			Name: v.Name,
		})
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
