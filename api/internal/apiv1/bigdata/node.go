package bigdata

import (
	"strings"

	"github.com/ego-component/egorm"
	"github.com/google/uuid"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/node"
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
	obj := &db.BigdataNode{
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
	err := db.NodeCreate(tx, obj)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	if err = db.NodeContentCreate(tx, &db.BigdataNodeContent{
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
	c.JSONOK(obj)
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
	if err := db.NodeHistoryCreate(tx, &db.BigdataNodeHistory{
		UUID:    onlyId,
		NodeId:  id,
		Content: req.Content,
		Uid:     c.Uid(),
	}); err != nil {
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
	n, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if n.Status == db.NodeStatusHandler {
		c.JSONE(1, "you should stop running before delete", nil)
		return
	}
	tx := invoker.Db.Begin()
	if err = db.NodeDelete(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err = db.NodeContentDelete(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "delete failed: "+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
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
	res := view.RespInfoNode{
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
		u, _ := db.UserInfo(res.LockUid)
		res.Username = u.Username
		res.Nickname = u.Nickname
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
	var node db.BigdataNode
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

func NodeList(c *core.Context) {
	var req view.ReqListNode
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
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
	fs, err := db.FolderList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	// no folder node
	conds["folder_id"] = 0
	nsnf, _ := db.NodeList(conds)
	// root
	res := view.RespListFolder{
		Id:       0,
		Name:     "root",
		Desc:     "",
		ParentId: -1,
		Children: make([]view.RespListFolder, 0),
		Nodes:    nsnf,
	}
	// level 1
	level1children := make(map[int][]view.RespListFolder)
	for _, f := range fs {
		// query nodes
		condsNs := egorm.Conds{}
		condsNs["folder_id"] = f.ID
		ns, _ := db.NodeList(condsNs)
		// build item
		item := view.RespListFolder{
			Id:        f.ID,
			Name:      f.Name,
			Desc:      f.Desc,
			ParentId:  f.ParentId,
			Children:  make([]view.RespListFolder, 0),
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
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func NodeRun(c *core.Context) {
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
	if n.LockUid != c.Uid() {
		c.JSONE(1, "please get the node lock and try again", nil)
		return
	}
	nc, err := db.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res, err := node.Operator(&n, &nc, node.OperatorRun)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	afterNodeInfo, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res.Status = afterNodeInfo.Status
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func NodeStop(c *core.Context) {
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
	if n.LockUid != c.Uid() {
		c.JSONE(1, "please get the node lock and try again", nil)
		return
	}
	nc, err := db.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res, err := node.Operator(&n, &nc, node.OperatorStop)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	afterNodeInfo, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res.Status = afterNodeInfo.Status
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func NodeStatusList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var resp view.RespRunNodeStatus
	// node info
	n, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	resp.Id = n.ID
	resp.Status = n.Status
	// node status info
	conds := egorm.Conds{}
	conds["node_id"] = id
	_, nss := db.NodeStatusListPage(conds, &db.ReqPage{
		Current:  1,
		PageSize: 100,
	})
	if len(nss) > 0 {
		resp.Current = nss[0]
		resp.Histories = nss
	}
	c.JSONE(core.CodeOK, "succ", resp)
	return
}

func NodeHistoryInfo(c *core.Context) {
	id := strings.TrimSpace(c.Param("uuid"))
	if id == "" {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	nh, err := db.NodeHistoryInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", nh)
	return
}

func NodeHistoryListPage(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqNodeHistoryList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "请求参数错误. "+err.Error(), nil)
		return
	}
	total, nhl := db.NodeHistoryListPage(egorm.Conds{"node_id": id}, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})

	list := make([]view.NodeHistoryItem, 0)
	for _, nh := range nhl {
		u, _ := db.UserInfo(nh.Uid)
		list = append(list, view.NodeHistoryItem{
			UUID:     nh.UUID,
			Utime:    nh.Utime,
			Uid:      nh.Uid,
			UserName: u.Username,
			Nickname: u.Nickname,
		})
	}
	c.JSONPage(view.RespNodeHistoryList{
		Total: total,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}
