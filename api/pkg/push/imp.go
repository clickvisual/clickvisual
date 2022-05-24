package push

import (
	"errors"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	ChannelDingDing int = 1
	ChannelWeChat   int = 2
)

type Operator interface {
	Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel, oneTheLogs string) (err error)
}

func Instance(typ int) (Operator, error) {
	var err error
	switch typ {
	case ChannelDingDing:
		return &DingDing{}, nil
	case ChannelWeChat:
		return &WeChat{}, nil
	default:
		err = errors.New("undefined channels")
	}
	return nil, err
}
