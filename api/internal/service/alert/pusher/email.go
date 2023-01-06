package pusher

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type Email struct {
}

// TODO 需要增加读取邮件的配置，后续更新
// Need to increase the configuration of reading mail, follow-up update

func (e *Email) Send(channel *db.AlarmChannel, msg *db.PushMsg) (err error) {
	return nil
}
