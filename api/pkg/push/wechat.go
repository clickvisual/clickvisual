package push

import (
	"errors"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type WeChat struct{}

// Send ...
// oneTheLogs one of the logs, detail info
func (d *WeChat) Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel, oneTheLogs string) (err error) {
	// TODO: implement
	return errors.New("functionality is not yet implemented")
}
