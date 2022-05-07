package alarm

import (
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/alertmanager"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Webhook(c *core.Context) {
	var notification view.Notification
	err := c.Bind(&notification)
	if err != nil {
		invoker.Logger.Error("webhook", elog.Any("notification", notification))
		c.JSONE(1, "invalid parameter", err.Error())
		return
	}
	invoker.Logger.Debug("webhook", elog.Any("notification", notification))
	err = alertmanager.Send(notification.CommonLabels["uuid"], notification)
	if err != nil {
		c.JSONE(1, "message send failed", err.Error())
		return
	}
	c.JSONOK()
	return
}
