package alarm

import (
	"github.com/gotomicro/ego/core/econf"
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
	var uuid string
	uuid = notification.CommonLabels["uuid"]
	if econf.GetBool("debug") && uuid == "" {
		uuid = "9f4322b9-91f4-415f-ab29-9883aef0bd1f"
	}
	err = alertmanager.Send(uuid, notification)
	if err != nil {
		c.JSONE(1, "message send failed", err.Error())
		return
	}
	c.JSONOK()
	return
}
