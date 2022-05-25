package alarm

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func ChannelCreate(c *core.Context) {
	var req db.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	req.Uid = c.Uid()
	err := db.AlarmChannelCreate(invoker.Db, &req)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsChannelsCreate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func ChannelUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req db.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["name"] = req.Name
	ups["typ"] = req.Typ
	ups["key"] = req.Key
	ups["uid"] = c.Uid()
	if err := db.AlarmChannelUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsChannelsUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func ChannelList(c *core.Context) {
	res, err := db.AlarmChannelList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func ChannelDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	alarmInfo, _ := db.AlarmChannelInfo(invoker.Db, id)
	if err := db.AlarmChannelDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsChannelsDelete, map[string]interface{}{"alarmInfo": alarmInfo})
	c.JSONOK()
}

func ChannelInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db.AlarmChannelInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
