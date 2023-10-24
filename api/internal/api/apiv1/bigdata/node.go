package bigdata

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/google/uuid"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/node"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// @Tags         BIGDATA
func NodeCreate(c *core.Context) {
	var req view2.ReqCreateNode
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
	tx := invoker.Db.Begin()
	obj := &db2.BigdataNode{
		Uid:        c.Uid(),
		Iid:        req.Iid,
		FolderID:   req.FolderId,
		Primary:    req.Primary,
		Secondary:  req.Secondary,
		Tertiary:   req.Tertiary,
		Name:       req.Name,
		Desc:       req.Desc,
		WorkflowId: req.WorkflowId,
		SourceId:   req.SourceId,
		LockUid:    0,
		LockAt:     0,
	}
	err := db2.NodeCreate(tx, obj)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	if err = db2.NodeContentCreate(tx, &db2.BigdataNodeContent{
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
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeCreate, map[string]interface{}{"obj": obj})
	c.JSONOK(obj)
}

// @Tags         BIGDATA
func NodeUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db2.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view2.ReqUpdateNode
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	if req.Tertiary != 0 {
		ups["tertiary"] = req.Tertiary
	}
	if req.SourceId != 0 {
		ups["sourceId"] = req.SourceId
	}
	if req.FolderId != 0 {
		ups["folder_id"] = req.FolderId
	}
	if req.Name != "" {
		ups["name"] = req.Name
	}
	if req.Desc != "" {
		ups["desc"] = req.Desc
	}
	ups["uid"] = c.Uid()
	// create node content history
	onlyId := uuid.New().String()
	ups["uuid"] = onlyId
	if err = db2.NodeUpdate(tx, id, ups); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}

	upsContent := make(map[string]interface{}, 0)
	upsContent["content"] = req.Content
	if err = db2.NodeContentUpdate(tx, id, upsContent); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	if err = db2.NodeHistoryCreate(tx, &db2.BigdataNodeHistory{
		UUID:    onlyId,
		NodeId:  id,
		Content: req.Content,
		Uid:     c.Uid(),
	}); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeUpdate, map[string]interface{}{"obj": req})
	c.JSONOK()
}

// @Tags         BIGDATA
func NodeDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db2.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if n.Status == db2.NodeStatusHandler {
		u, _ := db2.UserInfo(n.LockUid)
		c.JSONE(1, fmt.Sprintf("node %s is running by %s", n.Name, u.Nickname), nil)
		return
	}
	if n.LockUid != c.Uid() {
		u, _ := db2.UserInfo(n.LockUid)
		c.JSONE(1, fmt.Sprintf("node %s is editing by %s", n.Name, u.Nickname), nil)
		return
	}
	tx := invoker.Db.Begin()
	if err = db2.NodeDelete(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err = db2.NodeContentDelete(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeDelete, map[string]interface{}{"obj": n})

	c.JSONOK()
}

// @Tags         BIGDATA
func NodeInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db2.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	nc, err := db2.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res := view2.RespInfoNode{
		Id:      n.ID,
		Name:    n.Name,
		Desc:    n.Desc,
		Content: nc.Content,
		LockUid: n.LockUid,
		LockAt:  n.LockAt,
		Status:  n.Status,
		Result:  nc.Result,
	}
	if res.LockUid != 0 {
		u, _ := db2.UserInfo(res.LockUid)
		res.Username = u.Username
		res.Nickname = u.Nickname
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func NodeLock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var n db2.BigdataNode
	err := invoker.Db.Where("id = ?", id).First(&n).Error
	if err != nil || n.ID == 0 {
		c.JSONE(1, "failed to get information", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	err = service.Node.NodeTryLock(c.Uid(), id, false)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeLock, map[string]interface{}{"obj": n})
	c.JSONOK()
}

// @Tags         BIGDATA
func NodeUnlock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var n db2.BigdataNode
	err := invoker.Db.Where("id = ?", id).First(&n).Error
	if err != nil || n.ID == 0 {
		c.JSONE(1, "failed to get information", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	err = service.Node.NodeUnlock(c.Uid(), id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeUnlock, map[string]interface{}{"obj": n})

	c.JSONOK()
}

// @Tags         BIGDATA
func NodeList(c *core.Context) {
	var req view2.ReqListNode
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
	conds["primary"] = req.Primary
	if req.Secondary != 0 {
		conds["secondary"] = req.Secondary
	}
	if req.WorkflowId != 0 {
		conds["workflow_id"] = req.WorkflowId
	}
	fs, err := db2.FolderList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	// no folder node
	conds["folder_id"] = 0
	nsnf, _ := db2.NodeList(conds)
	// root
	res := view2.RespListFolder{
		Id:       0,
		Name:     "root",
		Desc:     "",
		ParentId: -1,
		Children: make([]view2.RespListFolder, 0),
		Nodes:    nsnf,
	}
	// level 1
	level1children := make(map[int][]view2.RespListFolder)
	for _, f := range fs {
		// query nodes
		condsNs := egorm.Conds{}
		condsNs["folder_id"] = f.ID
		ns, _ := db2.NodeList(condsNs)
		// build item
		item := view2.RespListFolder{
			Id:        f.ID,
			Name:      f.Name,
			Desc:      f.Desc,
			ParentId:  f.ParentId,
			Children:  make([]view2.RespListFolder, 0),
			Nodes:     ns,
			Primary:   f.Primary,
			Secondary: f.Secondary,
		}
		if f.ParentId != 0 {
			level1children[f.ParentId] = append(level1children[f.ParentId], item)
		} else {
			res.Children = append(res.Children, item)
		}
	}
	// level 2
	for index, level1 := range res.Children {
		if l1c, ok := level1children[level1.Id]; ok {
			res.Children[index].Children = append(res.Children[index].Children, l1c...)
		}
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func NodeRun(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db2.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeRun, map[string]interface{}{"obj": n})
	res, err := node.Run(id, c.Uid())
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), res)
		return
	}
	c.JSONOK(res)
}

// @Tags         BIGDATA
func NodeStop(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db2.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if n.LockUid != c.Uid() {
		u, _ := db2.UserInfo(n.LockUid)
		c.JSONE(1, fmt.Sprintf("%s is editing %s", u.Nickname, n.Name), nil)
		return
	}
	nc, err := db2.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res, err := node.Operator(&n, &nc, node.OperatorStop, c.Uid())
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	afterNodeInfo, err := db2.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res.Status = afterNodeInfo.Status
	event.Event.Pandas(c.User(), db2.OpnBigDataNodeStop, map[string]interface{}{"obj": n})
	c.JSONOK(res)
}

// @Tags         BIGDATA
func NodeHistoryInfo(c *core.Context) {
	id := strings.TrimSpace(c.Param("uuid"))
	if id == "" {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	nh, err := db2.NodeHistoryInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	var n db2.BigdataNode
	err = invoker.Db.Where("id = ?", nh.NodeId).First(&n).Error
	if err != nil || n.ID == 0 {
		c.JSONE(1, "failed to get information", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	c.JSONOK(nh)
}

// @Tags         BIGDATA
func NodeHistoryListPage(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var n db2.BigdataNode
	err := invoker.Db.Where("id = ?", id).First(&n).Error
	if err != nil || n.ID == 0 {
		c.JSONE(1, "failed to get information", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view2.ReqNodeHistoryList
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "请求参数错误. "+err.Error(), nil)
		return
	}
	total, nhl := db2.NodeHistoryListPage(egorm.Conds{"node_id": id}, &db2.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})

	list := make([]view2.NodeHistoryItem, 0)
	for _, nh := range nhl {
		u, _ := db2.UserInfo(nh.Uid)
		list = append(list, view2.NodeHistoryItem{
			UUID:     nh.UUID,
			Utime:    nh.Utime,
			Uid:      nh.Uid,
			UserName: u.Username,
			Nickname: u.Nickname,
		})
	}
	c.JSONPage(view2.RespNodeHistoryList{
		Total: total,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
}

// @Tags         BIGDATA
func NodeResultInfo(c *core.Context) {
	id := cast.ToInt(c.Param("rid"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	nr, err := db2.NodeResultInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	nodeInfo, _ := db2.NodeInfo(invoker.Db, nr.NodeId)
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(nodeInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	c.JSONOK(service.Node.NodeResultRespAssemble(&nr))
}
