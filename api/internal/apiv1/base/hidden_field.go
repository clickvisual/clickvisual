package base

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

func HiddenUpsert(c *core.Context) {
	tid := cast.ToInt(c.Param("tid"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var (
		req view.HiddenFieldCreate
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(core.CodeErr, "param error:"+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tid),
	}); err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	conds := egorm.Conds{"tid": egorm.Cond{
		Op:  "=",
		Val: tid,
	}}
	list, err := db.HiddenFieldList(conds)
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
	if deleteList != nil && len(deleteList) > 0 {
		deleteField := make([]string, 0, len(deleteList))
		for i := range deleteList {
			deleteField = append(deleteField, deleteList[i].(string))
		}
		err = db.HiddenFieldDeleteByFields(invoker.Db, deleteField)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}

	if insert != nil && len(insert) > 0 {
		hiddenFields := make([]*db.BaseHiddenField, 0)
		for i := range insert {
			hiddenFields = append(hiddenFields, &db.BaseHiddenField{
				Tid:   tid,
				Field: insert[i].(string),
			})
		}
		err = db.HiddenFieldCreateBatch(invoker.Db, hiddenFields)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}
	c.JSONOK()
}

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
	list, err := db.HiddenFieldList(conds)
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
