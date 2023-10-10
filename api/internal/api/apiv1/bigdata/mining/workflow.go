package mining

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// @Tags         BIGDATA
func WorkflowCreate(c *core.Context) {
	var req view2.ReqCreateWorkflow
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj := &db2.BigdataWorkflow{
		Iid:  req.Iid,
		Name: req.Name,
		Desc: req.Desc,
		Uid:  c.Uid(),
	}
	err := db2.WorkflowCreate(invoker.Db, obj)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataWorkflowCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

// @Tags         BIGDATA
func WorkflowUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db2.WorkflowInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(res.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view2.ReqUpdateWorkflow
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["uid"] = c.Uid()
	ups["name"] = req.Name
	ups["desc"] = req.Desc

	if err = db2.WorkflowUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataWorkflowUpdate, map[string]interface{}{"obj": req})
	c.JSONOK()
}

// @Tags         BIGDATA
func WorkflowList(c *core.Context) {
	var req view2.ReqListWorkflow
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	conds := egorm.Conds{}
	conds["iid"] = req.Iid
	res, err := db2.WorkflowList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func WorkflowDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db2.WorkflowInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(res.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if err = db2.WorkflowDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataWorkflowDelete, map[string]interface{}{"obj": res})
	c.JSONOK()
}

// @Tags         BIGDATA
func WorkflowInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db2.WorkflowInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(res.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	c.JSONOK(res)
}
