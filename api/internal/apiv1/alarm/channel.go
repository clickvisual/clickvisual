package alarm

import (
	"errors"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/push"
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"
	"strings"
)

const (
	FEISHUURL = "https://open.feishu.cn/open-apis/bot/v2/hook/"
	SLACKURL  = "https://hooks.slack.com/services/"
)

func ChannelCreate(c *core.Context) {
	var req db.AlarmChannel
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	req.Uid = c.Uid()
	if err := JudgmentType(req); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	err := db.AlarmChannelCreate(invoker.Db, &req)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsChannelsCreate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// JudgmentType judgment channel key legality
// temporary support slack feishu
func JudgmentType(req db.AlarmChannel) (err error) {
	switch req.Typ {
	//TODO finish all channels support
	case push.ChannelDingDing:
	case push.ChannelWeChat:
	case push.ChannelTelegram:
	case push.ChannelEmail:
	case push.ChannelFeiShu:
		if !strings.Contains(req.Key, FEISHUURL) {
			err = errors.New("invalid FeiShu webhook url")
			return
		}
		//TODO Regularity constraints
	case push.ChannelSlack:
		if !strings.Contains(req.Key, SLACKURL) {
			err = errors.New("invalid Slack webhook url")
			return
		}
	}
	return nil
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
	if err := JudgmentType(req); err != nil {
		c.JSONE(1, err.Error(), nil)
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
