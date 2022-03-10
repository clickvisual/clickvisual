package alertmanager

import (
	"errors"

	"github.com/gotomicro/ego-component/egorm"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

const (
	ChannelDingDing int = 1
)

type Operator interface {
	Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel) (err error)
}

func Send(alarmUUID string, notification view.Notification) (err error) {
	conds := egorm.Conds{}
	conds["uuid"] = alarmUUID
	alarm, err := db.AlarmInfoX(invoker.Db, conds)
	if err != nil {
		return err
	}
	// create history
	alarmHistory := db.AlarmHistory{AlarmId: alarm.ID}
	if err = db.AlarmHistoryCreate(invoker.Db, &alarmHistory); err != nil {
		return err
	}
	for _, channelId := range alarm.ChannelIds {
		channelInfo, errAlarmChannelInfo := db.AlarmChannelInfo(invoker.Db, channelId)
		if errAlarmChannelInfo != nil {
			return errAlarmChannelInfo
		}
		channelInstance, errChannelType := channelType(channelInfo.Typ)
		if errChannelType != nil {
			return errChannelType
		}
		errSend := channelInstance.Send(notification, &alarm, &channelInfo)
		if errSend != nil {
			return errSend
		}
	}
	if err = db.AlarmHistoryUpdate(invoker.Db, alarmHistory.ID, map[string]interface{}{"is_pushed": 1}); err != nil {
		return err
	}
	return nil
}

func channelType(typ int) (Operator, error) {
	var (
		err error
	)
	switch typ {
	case ChannelDingDing:
		return &DingDing{}, nil
	default:
		err = errors.New("undefined channels")
	}
	return nil, err
}
