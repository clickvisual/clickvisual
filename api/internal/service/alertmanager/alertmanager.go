package alertmanager

import (
	"github.com/gotomicro/ego-component/egorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/push"
)

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
	err = db.AlarmStatusUpdate(alarm.ID, notification.Status)
	if err != nil {
		return err
	}
	for _, channelId := range alarm.ChannelIds {
		channelInfo, errAlarmChannelInfo := db.AlarmChannelInfo(invoker.Db, channelId)
		if errAlarmChannelInfo != nil {
			return errAlarmChannelInfo
		}
		channelInstance, errChannelType := push.Instance(channelInfo.Typ)
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
