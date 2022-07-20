package mining

import (
	"encoding/json"
	"strconv"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/worker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func CrontabCreate(c *core.Context) {
	var req view.ReqCreateCrontab
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, req.NodeId)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	argsBytes, _ := json.Marshal(req.Args)
	obj := &db.BigdataCrontab{
		NodeId:  req.NodeId,
		Desc:    req.Desc,
		DutyUid: req.DutyUid,
		Cron:    req.Cron,
		Typ:     req.Typ,
		Args:    string(argsBytes),
		Uid:     c.Uid(),
	}
	err = db.CrontabCreate(invoker.Db, obj)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataNodeCrontabCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

func CrontabUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var req view.ReqUpdateCrontab
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
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
	if req.Typ == db.CrontabTypSuspended {
		if err = worker.NodeCrontabStop(id); err != nil {
			c.JSONE(1, "update failed: "+err.Error(), nil)
			return
		}
		ups["status"] = db.CrontabStatusWait
	}
	if err = db.CrontabUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataNodeCrontabUpdate, map[string]interface{}{"obj": req})
	c.JSONOK()
}

func CrontabDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = db.CrontabDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	event.Event.BigDataCMDB(c.User(), db.OpnBigDataNodeCrontabDelete, map[string]interface{}{"nodeId": id})
	c.JSONOK()
}

func CrontabInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	n, err := db.NodeInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(n.Iid),
		SubResource: pmsplugin.BigData,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	res, _ := db.CrontabInfo(invoker.Db, id)
	if res.NodeId == 0 {
		c.JSONE(core.CodeOK, "new crontab", nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
