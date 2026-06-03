package base

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	aisvc "github.com/clickvisual/clickvisual/api/internal/service/ai"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

type settingsInstanceListItem struct {
	Id          int      `json:"id"`
	Name        string   `json:"name"`
	Datasource  string   `json:"datasource"`
	Desc        string   `json:"desc"`
	Clusters    []string `json:"clusters"`
	ClusterInfo []string `json:"clusterInfo"`
	Mode        int      `json:"mode"`
	Error       string   `json:"error"`
}

func SettingsInstanceList(c *core.Context) {
	res := make([]settingsInstanceListItem, 0)
	tmp, err := db2.InstanceList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	for _, row := range tmp {
		if !service.InstanceViewIsPermission(c.Uid(), row.ID) {
			continue
		}
		ins := settingsInstanceListItem{
			Id:         row.ID,
			Name:       row.Name,
			Datasource: row.Datasource,
			Desc:       row.Desc,
			Mode:       row.Mode,
		}
		fillSettingsInstanceRuntime(&ins)
		res = append(res, ins)
	}
	c.JSONOK(res)
}

func fillSettingsInstanceRuntime(ins *settingsInstanceListItem) {
	if ins == nil {
		return
	}
	if ins.Datasource != db2.DatasourceClickHouse && ins.Datasource != db2.DatasourceDatabend {
		return
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			elog.Error("SettingsInstanceList", l.S("step", "recover"), elog.Any("panic", recovered), elog.Any("instanceId", ins.Id))
			ins.Error = fmt.Sprintf("load runtime info failed: %v", recovered)
			ins.Clusters = nil
			ins.ClusterInfo = nil
		}
	}()

	op, err := service.InstanceManager.Load(ins.Id)
	if err != nil {
		elog.Error("SettingsInstanceList", l.S("step", "InstanceManager"), l.E(err))
		ins.Error = err.Error()
		return
	}
	clusterInfo, err := op.ClusterInfo()
	if err != nil {
		elog.Error("SettingsInstanceList", l.S("step", "ClusterInfo"), l.E(err))
		ins.Error = err.Error()
		return
	}
	cis := make([]string, 0, len(clusterInfo))
	cs := make([]string, 0, len(clusterInfo))
	isCluster := 0
	for _, ci := range clusterInfo {
		cis = append(cis, ci.Info())
		cs = append(cs, ci.Name)
		if ci.MaxShardNum > 1 || ci.MaxReplicaNum > 1 {
			isCluster = 1
		}
	}
	ins.Clusters = cs
	ins.ClusterInfo = cis
	ins.Mode = isCluster
}

func SettingsInstanceInfo(c *core.Context) {
	id := cast.ToInt(c.Param("instance-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if !service.InstanceViewIsPermission(c.Uid(), id) {
		c.JSONE(1, "authentication failed", nil)
		return
	}
	res, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res.Dsn = res.GetDSN()
	c.JSONOK(res)
}

func SettingsInstanceCreate(c *core.Context) {
	var req view.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if _, err := service.InstanceCreate(req); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesCreate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func SettingsInstanceUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("instance-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	req.PrometheusTarget = strings.TrimSpace(req.PrometheusTarget)
	if req.PrometheusTarget != "" {
		if err := service.Alert.PrometheusReload(req.PrometheusTarget); err != nil {
			c.JSONE(1, "create DB failed: "+err.Error(), nil)
			return
		}
	}
	objBef, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to update, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	if objBef.GetDSN() != req.Dsn {
		service.InstanceManager.Delete(objBef.DsKey())
		objUpdate := db2.BaseInstance{
			Datasource: req.Datasource,
			Name:       req.Name,
		}
		objUpdate.Dsn = req.Dsn
		objUpdate.ID = id
		if err = service.InstanceManager.Add(&objUpdate); err != nil {
			_ = service.InstanceManager.Add(&objBef)
			c.JSONE(1, "DNS configuration exception, database connection failure 03: "+err.Error(), nil)
			return
		}
		ups["dsn"] = objUpdate.SetDSN(strings.TrimSpace(req.Dsn))
	}
	ups["name"] = req.Name
	ups["datasource"] = req.Datasource
	ups["desc"] = req.Desc
	if err = db2.InstanceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func SettingsInstanceDelete(c *core.Context) {
	id := cast.ToInt(c.Param("instance-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	if err = db2.InstanceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.DeleteInstancePmsRoleGrant(invoker.Db, id); err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	service.InstanceManager.Delete(obj.DsKey())
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesDelete, map[string]interface{}{"instanceInfo": obj})
	c.JSONOK()
}

func SettingsInstanceTest(c *core.Context) {
	var req view.ReqTestInstance
	var err error
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	switch req.Datasource {
	case db2.DatasourceClickHouse:
		_, err = service.ClickHouseLink(req.Dsn)
	case db2.DatasourceDatabend:
		_, err = service.DatabendLink(req.Dsn)
	case db2.DatasourceAgent:
		var tmp = make([]string, 0)
		err = json.Unmarshal([]byte(req.Dsn), &tmp)
		if err != nil {
			c.JSONE(1, "invalid parameter: "+err.Error(), err)
			return
		}
		if len(tmp) == 0 {
			c.JSONE(1, "Please enter at least one agent address", nil)
			return
		}
	default:
		c.JSONE(1, "data source type error", nil)
		return
	}
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK("connection test success")
}

func SettingsAIInfo(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	resp, err := aisvc.GetSetting()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func SettingsAIUpdate(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var req view.ReqUpdateAISetting
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := aisvc.UpdateSetting(c.Uid(), req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func SettingsAITest(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	resp, err := aisvc.TestSetting()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func SettingsAlarmChannelList(c *core.Context) {
	res, err := db2.AlarmChannelList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(res)
}

func SettingsAlarmChannelInfo(c *core.Context) {
	id := cast.ToInt(c.Param("channel-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db2.AlarmChannelInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(res)
}

func SettingsAlarmChannelCreate(c *core.Context) {
	var req db2.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	req.Uid = c.Uid()
	if err := req.JudgmentType(); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	if err := db2.AlarmChannelCreate(invoker.Db, &req); err != nil {
		c.JSONE(1, "create failed: "+err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db2.OpnAlarmsChannelsCreate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func SettingsAlarmChannelUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("channel-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req db2.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	if err := req.JudgmentType(); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	ups := map[string]interface{}{
		"name": req.Name,
		"typ":  req.Typ,
		"key":  req.Key,
		"uid":  c.Uid(),
	}
	if err := db2.AlarmChannelUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db2.OpnAlarmsChannelsUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func SettingsAlarmChannelDelete(c *core.Context) {
	id := cast.ToInt(c.Param("channel-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	alarmInfo, _ := db2.AlarmChannelInfo(invoker.Db, id)
	if err := db2.AlarmChannelDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db2.OpnAlarmsChannelsDelete, map[string]interface{}{"alarmInfo": alarmInfo})
	c.JSONOK()
}

func SettingsAlarmChannelSendTest(c *core.Context) {
	var req db2.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	if err := service.SendTestToChannel(&req); err != nil {
		c.JSONE(1, "send test error: "+err.Error(), err)
		return
	}
	c.JSONOK("test message sent")
}
