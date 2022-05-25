package service

import (
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/push"
)

func Send(alarmUUID string, notification view.Notification) (err error) {
	conds := egorm.Conds{}
	conds["uuid"] = alarmUUID
	alarmObj, err := db.AlarmInfoX(invoker.Db, conds)
	if err != nil {
		return err
	}
	// create history
	alarmHistory := db.AlarmHistory{AlarmId: alarmObj.ID}
	if err = db.AlarmHistoryCreate(invoker.Db, &alarmHistory); err != nil {
		return err
	}
	err = db.AlarmStatusUpdate(alarmObj.ID, notification.Status)
	if err != nil {
		return err
	}
	// one of the logs
	ins, table, _, err := db.GetAlarmTableInstanceInfo(alarmObj.ID)
	if err != nil {
		return err
	}
	var oneTheLogs string
	op, err := InstanceManager.Load(ins.ID)
	if err != nil {
		return
	}
	condsFilter := egorm.Conds{}
	condsFilter["alarm_id"] = alarmObj.ID
	filters, err := db.AlarmFilterList(condsFilter)
	if err != nil {
		return
	}
	resp, err := op.GET(view.ReqQuery{
		Tid:           table.ID,
		Database:      table.Database.Name,
		Table:         table.Name,
		Query:         WhereConditionFromFilter(filters),
		TimeField:     table.TimeField,
		TimeFieldType: table.TimeFieldType,
		ST:            time.Now().Add(-db.UnitMap[alarmObj.Unit].Duration - time.Minute).Unix(),
		ET:            time.Now().Add(time.Minute).Unix(),
		Page:          1,
		PageSize:      1,
	}, table.ID)
	if len(resp.Logs) > 0 {
		if val, ok := resp.Logs[1]["_raw_log_"]; ok {
			oneTheLogs = val.(string)
		}
	}
	elog.Debug("sendAlert", elog.String("oneTheLogs", oneTheLogs))
	for _, channelId := range alarmObj.ChannelIds {
		channelInfo, errAlarmChannelInfo := db.AlarmChannelInfo(invoker.Db, channelId)
		if errAlarmChannelInfo != nil {
			return errAlarmChannelInfo
		}
		channelInstance, errChannelType := push.Instance(channelInfo.Typ)
		if errChannelType != nil {
			return errChannelType
		}
		errSend := channelInstance.Send(notification, &alarmObj, &channelInfo, oneTheLogs)
		if errSend != nil {
			return errSend
		}
	}
	if err = db.AlarmHistoryUpdate(invoker.Db, alarmHistory.ID, map[string]interface{}{"is_pushed": 1}); err != nil {
		return err
	}
	return nil
}
