package alarm

import (
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Webhook(c *core.Context) {
	var notification view.Notification
	err := c.Bind(&notification)
	if err != nil {
		invoker.Logger.Error("webhook", elog.Any("notification", notification))
		c.JSONE(1, "invalid parameter", err)
		return
	}
	invoker.Logger.Debug("alarm", elog.Any("notification", notification))
	err = service.Send(notification.CommonLabels["uuid"], notification)
	if err != nil {
		c.JSONE(1, "message send failed", err)
		return
	}
	c.JSONOK()
	return
}

func ChannelSendTest(c *core.Context) {
	var req db.AlarmChannel
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
