package bigdata

import (
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func NodeCreate(c *core.Context) {
	var req view.ReqCreateNode
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	obj := &db.Node{
		Uid:       c.Uid(),
		Iid:       req.Iid,
		FolderID:  req.FolderId,
		Primary:   req.Primary,
		Secondary: req.Secondary,
		Tertiary:  req.Tertiary,
		Name:      req.Name,
		Desc:      req.Desc,
		LockUid:   0,
		LockAt:    0,
	}
	err := db.NodeCreate(tx, obj)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	if err = db.NodeContentCreate(tx, &db.NodeContent{
		NodeId:  obj.ID,
		Content: req.Content,
	}); err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func NodeUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqUpdateNode
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	ups["folder_id"] = req.FolderId
	ups["name"] = req.Name
	ups["desc"] = req.Desc
	ups["uid"] = c.Uid()
	if err := db.NodeUpdate(tx, id, ups); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	upsContent := make(map[string]interface{}, 0)
	upsContent["content"] = req.Content
	if err := db.NodeContentUpdate(tx, id, upsContent); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	if err := tx.Commit().Error; err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func NodeDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	tx := invoker.Db.Begin()
	if err := db.NodeDelete(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err := db.NodeContentDelete(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err := tx.Commit().Error; err != nil {
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}

	c.JSONOK()
}

func NodeInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	nc, err := db.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res := view.RespCreateNode{
		Id:      n.ID,
		Name:    n.Name,
		Desc:    n.Desc,
		Content: nc.Content,
		LockUid: n.LockUid,
		LockAt:  n.LockAt,
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func NodeLock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var node db.Node
	err := invoker.Db.Where("id = ?", id).First(&node).Error
	if err != nil || node.ID == 0 {
		c.JSONE(1, "failed to get information", nil)
		return
	}
	err = service.NodeTryLock(c.Uid(), id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
	return
}

func NodeUnlock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	err := service.NodeUnlock(c.Uid(), id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
	return
}
