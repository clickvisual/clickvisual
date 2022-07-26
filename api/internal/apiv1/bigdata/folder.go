package bigdata

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func FolderCreate(c *core.Context) {
	var req view.ReqCreateFolder
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	obj := &db.BigdataFolder{
		Uid:        c.Uid(),
		Name:       req.Name,
		Desc:       req.Desc,
		ParentId:   req.ParentId,
		Primary:    req.Primary,
		Secondary:  req.Secondary,
		Iid:        req.Iid,
		WorkflowId: req.WorkflowId,
	}
	err := db.FolderCreate(invoker.Db, obj)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataFolderCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

func FolderUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	f, err := db.FolderInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(f.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var req view.ReqUpdateFolder
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["name"] = req.Name
	ups["desc"] = req.Desc
	ups["parent_id"] = req.ParentId
	ups["uid"] = c.Uid()
	if err = db.FolderUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataFolderUpdate, map[string]interface{}{"obj": req})
	c.JSONOK()
}

func FolderDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	f, err := db.FolderInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(f.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["folder_id"] = id
	ns, err := db.NodeList(conds)
	if err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	if len(ns) != 0 {
		c.JSONE(1, "failed to delete: u should delete nodes first.", nil)
		return
	}
	if err = db.FolderDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataFolderDelete, map[string]interface{}{"obj": f})
	c.JSONOK()
}

func FolderInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	f, err := db.FolderInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(f.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	res := view.RespInfoFolder{
		BigdataFolder: f,
	}
	if res.Uid != 0 {
		u, _ := db.UserInfo(f.Uid)
		res.UserName = u.Username
		res.NickName = u.Nickname
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
