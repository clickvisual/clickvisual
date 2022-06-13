package base

import (
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"
	"strconv"
	"strings"
)

func HiddenCreate(c *core.Context) {
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
		SubResource: pmsplugin.FieldManagement,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tid),
	}); err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	_, err = db.TableInfo(invoker.Db, tid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	fields := utils.StringSliceWithoutRepeat(req.Fields, true)
	if fields == nil || len(fields) == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	hiddenFields := make([]*db.HiddenField, 0)
	for i := range fields {
		hiddenFields = append(hiddenFields, &db.HiddenField{
			Tid:   tid,
			Field: fields[i],
		})
	}
	err = db.HiddenFieldCreateBatch(invoker.Db, hiddenFields)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK()
}

func HiddenDelete(c *core.Context) {
	tid := cast.ToInt(c.Param("tid"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var err error
	idParam := strings.TrimSpace(c.Query("ids"))
	if idParam == "" {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tid),
		SubResource: pmsplugin.FieldManagement,
		Acts:        []string{pmsplugin.ActDelete},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tid),
	}); err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	idArr := strings.Split(idParam, ",")
	ids := make([]int, 0)
	for i := range idArr {
		ids = append(ids, cast.ToInt(idArr[i]))
	}
	if err = db.HiddenFieldDelete(invoker.Db, ids); err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
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
	c.JSONOK(list)
}
