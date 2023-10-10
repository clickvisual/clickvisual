package base

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// @Tags         LOGSTORE
func HiddenUpsert(c *core.Context) {
	tid := cast.ToInt(c.Param("tid"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var (
		req view2.HiddenFieldCreate
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(core.CodeErr, "param error:"+err.Error(), nil)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, tid)
	if err != nil {
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
		DomainId:    strconv.Itoa(tid),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}

	conds := egorm.Conds{"tid": egorm.Cond{
		Op:  "=",
		Val: tid,
	}}
	list, err := db2.HiddenFieldList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	oldFields := make([]string, 0, len(list))
	for i := range list {
		oldFields = append(oldFields, list[i].Field)
	}
	cmp := func(a, b interface{}) bool {
		return a == b
	}
	deleteList := utils.DiffList(oldFields, req.Fields, cmp)
	insert := utils.DiffList(req.Fields, oldFields, cmp)
	if len(deleteList) > 0 {
		deleteField := make([]string, 0, len(deleteList))
		for i := range deleteList {
			deleteField = append(deleteField, deleteList[i].(string))
		}
		err = db2.HiddenFieldDeleteByFields(invoker.Db, deleteField)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}

	if len(insert) > 0 {
		hiddenFields := make([]*db2.BaseHiddenField, 0)
		for i := range insert {
			hiddenFields = append(hiddenFields, &db2.BaseHiddenField{
				Tid:   tid,
				Field: insert[i].(string),
			})
		}
		err = db2.HiddenFieldCreateBatch(invoker.Db, hiddenFields)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}
	c.JSONOK()
}

// @Tags         LOGSTORE
func HiddenList(c *core.Context) {
	tid := cast.ToInt(c.Param("tid"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	conds := egorm.Conds{"tid": egorm.Cond{
		Op:  "=",
		Val: tid,
	}}
	list, err := db2.HiddenFieldList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	result := make([]string, 0, len(list))
	for i := range list {
		result = append(result, list[i].Field)
	}
	c.JSONOK(result)
}
