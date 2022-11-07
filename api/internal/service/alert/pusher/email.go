package pusher

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type Email struct {
}

// TODO 需要增加读取邮件的配置，后续更新
// Need to increase the configuration of reading mail, follow-up update

func (e *Email) Send(notification db.Notification, table *db.BaseTable, alarm *db.Alarm, filter *db.AlarmFilter, channel *db.AlarmChannel, oneTheLogs string) (err error) {
	return nil
}
