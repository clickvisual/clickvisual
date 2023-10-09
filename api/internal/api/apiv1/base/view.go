package base

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// ViewDelete
// @Summary		 删除视图
// @Tags         LOGSTORE
func ViewDelete(c *core.Context) {
	var err error
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "error id", nil)
		return
	}
	if id == -1 {
		c.JSONE(1, "default time field not support delete", nil)
		return
	}
	var viewInfo db2.BaseView
	viewInfo, err = db2.ViewInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, viewInfo.Tid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActDelete},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	tx := invoker.Db.Begin()
	err = db2.ViewDelete(tx, id)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewList []*db2.BaseView
	conds := egorm.Conds{}
	conds["tid"] = viewInfo.Tid
	viewList, err = db2.ViewList(tx, conds)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}

	databaseInfo, _ := db2.DatabaseInfo(tx, tableInfo.Did)
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	dSQL, cQSL, err := op.SyncView(tableInfo, &viewInfo, viewList, false)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups := make(map[string]interface{}, 0)
	ups["sql_view"] = cQSL
	err = db2.ViewUpdate(tx, id, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups2 := make(map[string]interface{}, 0)
	ups2["sql_view"] = dSQL
	err = db2.TableUpdate(tx, id, ups2)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnViewsDelete, map[string]interface{}{"viewInfo": viewInfo})
	c.JSONOK()
}

// ViewCreate
// @Tags         LOGSTORE
func ViewCreate(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	params := view2.ReqViewCreate{}
	err := c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if strings.Contains(params.Key, " ") {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db2.TableInfo(invoker.Db, tid)
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	current := db2.BaseView{
		Tid:              tid,
		Name:             params.Name,
		IsUseDefaultTime: params.IsUseDefaultTime,
		Key:              params.Key,
		Format:           params.Format,
	}
	tx := invoker.Db.Begin()
	if err = db2.ViewCreate(tx, &current); err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewList []*db2.BaseView
	condsView := egorm.Conds{}
	condsView["tid"] = tid
	viewList, err = db2.ViewList(tx, condsView)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	databaseInfo, _ := db2.DatabaseInfo(tx, tableInfo.Did)
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	dSQL, cQSL, err := op.SyncView(tableInfo, &current, viewList, true)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups := make(map[string]interface{}, 0)
	ups["sql_view"] = cQSL
	ups["uid"] = c.Uid()
	err = db2.ViewUpdate(tx, current.ID, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	ups2 := make(map[string]interface{}, 0)
	ups2["sql_view"] = dSQL
	ups2["uid"] = c.Uid()
	err = db2.TableUpdate(tx, tableInfo.ID, ups2)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnViewsCreate, map[string]interface{}{"viewInfo": current})
	c.JSONOK()
}

// @Tags         LOGSTORE
func ViewUpdate(c *core.Context) {
	var err error
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error id", nil)
		return
	}
	params := view2.ReqViewCreate{}
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
	err = db2.ViewUpdate(tx, id, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	var viewInfo db2.BaseView
	viewInfo, err = db2.ViewInfo(tx, id)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	tableInfo, err := db2.TableInfo(tx, viewInfo.Tid)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var viewList []*db2.BaseView
	conds := egorm.Conds{}
	conds["tid"] = viewInfo.Tid
	viewList, err = db2.ViewList(tx, conds)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), nil)
		return
	}
	databaseInfo, _ := db2.DatabaseInfo(tx, tableInfo.Did)
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	dSQL, cQSL, err := op.SyncView(tableInfo, &viewInfo, viewList, true)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	ups1 := make(map[string]interface{}, 0)
	ups1["sql_view"] = cQSL
	ups1["uid"] = c.Uid()
	err = db2.ViewUpdate(tx, viewInfo.ID, ups1)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	ups2 := make(map[string]interface{}, 0)
	ups2["sql_view"] = dSQL
	ups2["uid"] = c.Uid()
	err = db2.TableUpdate(tx, tableInfo.ID, ups2)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnViewsUpdate, map[string]interface{}{"params": params})
	c.JSONOK()
}

// @Tags         LOGSTORE
func ViewInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "error id", nil)
		return
	}
	if id == -1 {
		c.JSONE(1, "default time field not support modify", nil)
		return
	}
	viewInfo, err := db2.ViewInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, viewInfo.Tid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	c.JSONOK(viewInfo)
}

// @Tags         LOGSTORE
func ViewList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db2.TableInfo(invoker.Db, id)
	iid := tableInfo.Database.Iid
	database := tableInfo.Database.Name
	table := tableInfo.Name
	if iid == 0 || database == "" || table == "" {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	condsView := egorm.Conds{}
	condsView["tid"] = tableInfo.ID
	views, err := db2.ViewList(invoker.Db, condsView)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	var res []view2.ReqViewList
	res = make([]view2.ReqViewList, 0)

	// add default val
	res = append(res, view2.ReqViewList{
		ID:   -1,
		Name: tableInfo.GetTimeField(),
	})

	for _, v := range views {
		res = append(res, view2.ReqViewList{
			ID:   v.ID,
			Name: v.Name,
		})
	}
	c.JSONOK(res)
}
