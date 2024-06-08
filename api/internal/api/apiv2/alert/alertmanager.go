package alert

import (
	"github.com/gotomicro/cetus/l"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service"
)

// Webhook  godoc
// @Summary      告警推送 Webhook
// @Description {"version":"4","groupKey":"{}:{alertname=\\"e6e85281_6e22_4159_90e8_38943e75fb3f_194\\"}","status":"firing","receiver":"webhook","groupLabels":{"alertname":"e6e85281_6e22_4159_90e8_38943e75fb3f_194"},"commonLabels":{"alertname":"e6e85281_6e22_4159_90e8_38943e75fb3f_194","filterId":"194","severity":"warning","uuid":"e6e85281-6e22-4159-90e8-38943e75fb3f"},"commonAnnotations":{"description":" (当前值: 1)","summary":"告警 "},"externalURL":"http://duminxiangdeMacBook-Pro.local:9093","alerts":[{"labels":{"alertname":"e6e85281_6e22_4159_90e8_38943e75fb3f_194","filterId":"194","severity":"warning","uuid":"e6e85281-6e22-4159-90e8-38943e75fb3f"},"annotations":{"description":" (当前值: 1)","summary":"告警 "},"startsAt":"2022-11-07T09:23:17.6Z","endsAt":"0001-01-01T00:00:00Z"}]}
// @Tags         ALARM
// @Produce      json
// @Param        req body db.Notification true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v1/prometheus/alerts [post]
func Webhook(c *core.Context) {
	elog.Debug("start", elog.FieldMethod("Webhook"))
	var notification db.Notification
	err := c.Bind(&notification)
	if err != nil {
		elog.Error("Bind", elog.FieldMethod("Webhook"), elog.Any("notification", notification))
		c.JSONE(1, "invalid parameter", err)
		return
	}
	err = service.Alert.HandlerAlertManager(strings.TrimSpace(notification.CommonLabels["uuid"]), strings.TrimSpace(notification.CommonLabels["filterId"]), notification)
	if err != nil {
		elog.Error("HandlerAlertManager", elog.FieldMethod("Webhook"), elog.Any("notification", notification), l.E(err))
		c.JSONE(1, "message send failed: "+err.Error(), err)
		return
	}
	elog.Debug("finish", elog.FieldMethod("Webhook"), elog.Any("notification", notification))
	c.JSONOK()
}
