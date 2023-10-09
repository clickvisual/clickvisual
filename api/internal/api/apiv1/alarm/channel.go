package alarm

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
)

// ChannelCreate
// @Tags         ALARM
// @Summary	     告警渠道创建
func ChannelCreate(c *core.Context) {
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
	err := db2.AlarmChannelCreate(invoker.Db, &req)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db2.OpnAlarmsChannelsCreate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// ChannelUpdate
// @Tags         ALARM
// @Summary	     告警渠道更新
func ChannelUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
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
	ups := make(map[string]interface{}, 0)
	ups["name"] = req.Name
	ups["typ"] = req.Typ
	ups["key"] = req.Key
	ups["uid"] = c.Uid()
	if err := db2.AlarmChannelUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db2.OpnAlarmsChannelsUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// ChannelList
// @Tags         ALARM
// @Summary	     告警渠道列表
func ChannelList(c *core.Context) {
	res, err := db2.AlarmChannelList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(res)
}

// ChannelDelete
// @Tags         ALARM
// @Summary	     告警渠道删除
func ChannelDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
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

// ChannelInfo
// @Tags         ALARM
// @Summary	     告警渠道详情
func ChannelInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
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

// ChannelSendTest
// @Tags         ALARM
// @Summary	     告警渠道测试
func ChannelSendTest(c *core.Context) {
	var req db2.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	if err := service.SendTestToChannel(&req); err != nil {
		c.JSONE(1, "send test error: "+err.Error(), err)
		return
	}
	c.JSONOK()
}
