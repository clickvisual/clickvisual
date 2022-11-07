package pusher

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type Email struct {
}

// TODO 需要增加读取邮件的配置，后续更新
// Need to increase the configuration of reading mail, follow-up update

func (e *Email) Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel, oneTheLogs string) (err error) {
	return nil
}
