package pandas

import (
	"encoding/json"
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/worker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// NodeLockAcquire  godoc
// @Summary	     Force the file edit lock to be acquired
// @Description  Force the file edit lock to be acquired
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        node-id path int true "node id"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/pandas/nodes/{node-id}/lock-acquire [post]
func NodeLockAcquire(c *core.Context) {
	nodeId := cast.ToInt(c.Param("node-id"))
	if nodeId == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var n db.BigdataNode
	if err := invoker.Db.Where("id = ?", nodeId).First(&n).Error; err != nil || n.ID == 0 {
		c.JSONE(1, "failed to get information", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err := service.Node.NodeTryLock(c.Uid(), nodeId, true); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataNodeLock, map[string]interface{}{"obj": n})
	c.JSONOK()
	return
}

// NodeCrontabCreate  godoc
// @Summary	     Creating a scheduled node scheduling task
// @Description  isRetry: 0 no 1 yes
// @Description  retryInterval: the unit is in seconds, 100 means 100s
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        node-id path int true "node id"
// @Param        req body view.ReqCreateCrontab true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/pandas/nodes/{node-id}/crontab [post]
func NodeCrontabCreate(c *core.Context) {
	nodeId := cast.ToInt(c.Param("node-id"))
	if nodeId == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqCreateCrontab
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	argsBytes, _ := json.Marshal(req.Args)
	obj := &db.BigdataCrontab{
		NodeId:        nodeId,
		Desc:          req.Desc,
		DutyUid:       req.DutyUid,
		Cron:          req.Cron,
		Typ:           req.Typ,
		Args:          string(argsBytes),
		Uid:           c.Uid(),
		IsRetry:       req.IsRetry,
		RetryTimes:    req.RetryTimes,
		RetryInterval: req.RetryInterval,
	}
	err = db.CrontabCreate(invoker.Db, obj)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataNodeCrontabCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

// NodeCrontabUpdate  godoc
// @Summary	     Updating a scheduled node scheduling task
// @Description  isRetry: 0 no 1 yes
// @Description  retryInterval: the unit is in seconds, 100 means 100s
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        node-id path int true "node id"
// @Param        req body view.ReqUpdateCrontab true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/pandas/nodes/{node-id}/crontab [patch]
func NodeCrontabUpdate(c *core.Context) {
	nodeId := cast.ToInt(c.Param("node-id"))
	if nodeId == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqUpdateCrontab
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	nodeCrontabInfo, _ := db.CrontabInfo(invoker.Db, nodeId)
	var isReload bool = false
	if req.Cron != nodeCrontabInfo.Cron ||
		req.IsRetry != nodeCrontabInfo.IsRetry ||
		req.RetryTimes != nodeCrontabInfo.RetryTimes ||
		req.RetryInterval != nodeCrontabInfo.RetryInterval {
		isReload = true
	}
	argsBytes, _ := json.Marshal(req.Args)
	ups := make(map[string]interface{}, 0)
	ups["uid"] = c.Uid()
	ups["typ"] = req.Typ
	ups["desc"] = req.Desc
	ups["cron"] = req.Cron
	ups["duty_uid"] = req.DutyUid
	ups["args"] = string(argsBytes)
	ups["is_retry"] = req.IsRetry
	ups["retry_times"] = req.RetryTimes
	ups["retry_interval"] = req.RetryInterval
	if req.Typ == db.CrontabTypSuspended || isReload {
		if err = worker.NodeCrontabStop(nodeId); err != nil {
			c.JSONE(1, "update failed: "+err.Error(), nil)
			return
		}
		ups["status"] = db.CrontabStatusWait
	}
	if err = db.CrontabUpdate(invoker.Db, nodeId, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataNodeCrontabUpdate, map[string]interface{}{"obj": req})
	c.JSONOK()
}

// NodeResultUpdate  godoc
// @Summary	     Updates the action on the execution result
// @Description  only support excelProcess update
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        result-id path int true "result id"
// @Param        req query view.ReqNodeRunResult true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/pandas/nodes-results/{result-id} [patch]
func NodeResultUpdate(c *core.Context) {
	resultId := cast.ToInt(c.Param("result-id"))
	if resultId == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqNodeRunResult
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	nr, err := db.NodeResultInfo(invoker.Db, resultId)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	nodeInfo, _ := db.NodeInfo(invoker.Db, nr.NodeId)
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(nodeInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["uid"] = c.Uid()
	ups["excel_process"] = req.ExcelProcess
	if err = db.NodeResultUpdate(invoker.Db, resultId, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.Pandas(c.User(), db.OpnBigDataNodeResultUpdate, map[string]interface{}{"obj": req})
	c.JSONOK(service.Node.NodeResultRespAssemble(&nr))
	return
}

// NodeResultListPage  godoc
// @Summary	     Obtain the node execution result record
// @Description  Obtain the node execution result record
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        node-id path int true "node id"
// @Param        req query view.ReqNodeHistoryList true "params"
// @Success      200 {object} view.RespNodeResultList
// @Router       /api/v2/pandas/nodes/{node-id}/results [get]
func NodeResultListPage(c *core.Context) {
	id := cast.ToInt(c.Param("node-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	nodeInfo, _ := db.NodeInfo(invoker.Db, id)
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(nodeInfo.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var req view.ReqNodeHistoryList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "request parameter error: "+err.Error(), nil)
		return
	}
	invoker.Logger.Debug("nodeResultList", elog.Any("req", req))
	conds := egorm.Conds{}
	conds["node_id"] = id
	if req.IsExcludeCrontabResult == 1 {
		conds["uid"] = egorm.Cond{
			Op:  "!=",
			Val: -1,
		}
	}
	total, nodeResList := db.NodeResultListPage(conds, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	list := make([]view.RespNodeResult, 0)
	for _, nodeRes := range nodeResList {
		list = append(list, service.Node.NodeResultRespAssemble(nodeRes))
	}
	c.JSONPage(view.RespNodeResultList{
		Total: total,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}

// WorkerDashboard  godoc
// @Summary	     Kanban on the execution status of a scheduled task
// @Description  Kanban on the execution status of a scheduled task
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        req query view.ReqWorkerDashboard true "params"
// @Success      200 {object} view.RespWorkerDashboard
// @Router       /api/v2/pandas/workers/dashboard [get]
func WorkerDashboard(c *core.Context) {
	var req view.ReqWorkerDashboard
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	res := service.Node.WorkerDashboard(req, c.Uid())
	c.JSONOK(res)
	return
}

// WorkerList  godoc
// @Summary	     The scheduled task list
// @Description   The scheduled task list
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        req query view.ReqWorkerList true "params"
// @Success      200 {object} core.ResPage{data=view.RespWorkerList}
// @Router       /api/v2/pandas/workers [get]
func WorkerList(c *core.Context) {
	var req view.ReqWorkerList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	// Read node data according to user instance permissions
	condsNodes := egorm.Conds{}
	if req.Tertiary != 0 {
		condsNodes["tertiary"] = req.Tertiary
	}
	condsNodes["iid"] = req.Iid
	if req.NodeName != "" {
		condsNodes["name"] = egorm.Cond{
			Op:  "like",
			Val: req.NodeName,
		}
	}
	nodes, _ := db.NodeList(condsNodes)
	// Read the execution result based on the node information
	nodeIdArr := make([]int, 0)
	for _, n := range nodes {
		nodeIdArr = append(nodeIdArr, n.ID)
	}
	condsResult := egorm.Conds{}
	condsResult["uid"] = -1
	condsResult["node_id"] = egorm.Cond{
		Op:  "in",
		Val: nodeIdArr,
	}
	if req.Start != 0 {
		condsResult["utime"] = egorm.Cond{
			Op:  ">=",
			Val: req.Start,
		}
	}
	if req.End != 0 {
		condsResult["utime"] = egorm.Cond{
			Op:  "<=",
			Val: req.End,
		}
	}
	total, nodeResList := db.NodeResultListPage(condsResult, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	invoker.Logger.Debug("WorkerList", elog.Any("nodeIdArr", nodeIdArr), elog.Any("nodeResList", nodeResList))
	list := make([]view.RespWorkerRow, 0)
	// data processing: increase relevant plural information;
	for _, nodeRes := range nodeResList {
		list = append(list, service.Node.RespWorkerAssemble(nodeRes))
	}
	c.JSONPage(view.RespWorkerList{
		Total: total,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}

// TableDependencies  godoc
// @Summary	     Result of table dependency resolution
// @Description  Result of table dependency resolution
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        instance-id path int true "instance id"
// @Param        req query view.ReqTableDependencies true "params"
// @Success      200 {object} core.ResPage{data=view.RespTableDependencies}
// @Router       /api/v2/pandas/instances/{instance-id}/table-dependencies [get]
func TableDependencies(c *core.Context) {
	iid := cast.ToInt(c.Param("instance-id"))
	if iid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var req view.ReqTableDependencies
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	data, err := service.TableDeps(iid, req.DatabaseName, req.TableName)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	row, _ := db.EarliestDependRow()
	c.JSONOK(view.RespTableDependencies{
		Utime: row.Utime,
		Data:  data,
	})
	return
}
