package base

import (
	"strconv"

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

// IndexUpdate
// @Tags        LOGSTORE
// @Summary 	分析字段更新
func IndexUpdate(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var (
		req view2.ReqCreateIndex
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "param error:"+err.Error(), err)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, tid)
	if err != nil {
		c.JSONE(1, err.Error(), err)
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
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesIndexUpdate, map[string]interface{}{"req": req})
	if err = service.AnalysisFieldsUpdate(tid, req.Data); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}

// Indexes
// @Tags    LOGSTORE
// @Summary 分析字段列表
func Indexes(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	conds := egorm.Conds{}
	conds["tid"] = tid
	conds["kind"] = 1
	indexes, err := db2.IndexList(conds)
	if err != nil {
		c.JSONE(1, "unknown error: "+err.Error(), nil)
		return
	}
	c.JSONOK(indexes)
}
