package alarm

import (
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/service/alertmanager"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func Webhook(c *core.Context) {
	var notification view.Notification
	err := c.Bind(&notification)
	if err != nil {
		elog.Error("webhook", elog.Any("notification", notification))
		c.JSONE(1, "invalid parameter", err.Error())
		return
	}
	elog.Debug("webhook", elog.Any("notification", notification))
	err = alertmanager.Send(notification.CommonLabels["uuid"], notification)
	if err != nil {
		c.JSONE(1, "message send failed", err.Error())
		return
	}
	c.JSONOK()
	return
}
