package pandas

import (
	"encoding/json"
	"strconv"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/worker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
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
// @Param        nodeId path int true "node id"
// @Success      200  {string} ok
// @Router       /api/v2/pandas/nodes/:nodeId/lock-acquire [post]
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
	if err := service.NodeTryLock(c.Uid(), nodeId, true); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataNodeLock, map[string]interface{}{"obj": n})
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
// @Param        nodeId path int true "node id"
// @Param        req body view.ReqCreateCrontab true "params"
// @Success      200 {string} ok
// @Router       /api/v2/pandas/nodes/:nodeId/crontab [post]
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
		c.JSONE(1, err.Error(), nil)
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
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataNodeCrontabCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

// NodeCrontabUpdate  godoc
// @Summary	     Updating a scheduled node scheduling task
// @Description  isRetry: 0 no 1 yes
// @Description  retryInterval: the unit is in seconds, 100 means 100s
// @Tags         pandas
// @Accept       json
// @Produce      json
// @Param        nodeId path int true "node id"
// @Param        req body view.ReqUpdateCrontab true "params"
// @Success      200 {string} ok
// @Router       /api/v2/pandas/nodes/:nodeId/crontab [patch]
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
		c.JSONE(1, err.Error(), nil)
		return
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
	if req.Typ == db.CrontabTypSuspended {
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
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataNodeCrontabUpdate, map[string]interface{}{"obj": req})
	c.JSONOK()
}
