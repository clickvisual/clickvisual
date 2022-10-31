package service

import (
	"time"

	"github.com/ego-component/egorm"

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
	err = alarmObj.StatusUpdate(notification.Status)
	if err != nil {
		return err
	}
	// one of the logs
	_, relatedList, err := db.GetAlarmTableInstanceInfo(alarmObj.ID)
	if err != nil {
		return err
	}
	var (
		table db.BaseTable
		ins   db.BaseInstance
	)
	if len(relatedList) > 0 {
		table = relatedList[0].Table
		ins = relatedList[0].Instance
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
	if table.TimeField == "" {
		table.TimeField = db.TimeFieldSecond
	}
	if len(filters) == 1 {
		param := view.ReqQuery{
			Tid:           table.ID,
			Database:      table.Database.Name,
			Table:         table.Name,
			Query:         filters[0].When,
			TimeField:     table.TimeField,
			TimeFieldType: table.TimeFieldType,
			ST:            time.Now().Add(-db.UnitMap[alarmObj.Unit].Duration - time.Minute).Unix(),
			ET:            time.Now().Add(time.Minute).Unix(),
			Page:          1,
			PageSize:      1,
		}
		param, _ = op.Prepare(param, false)
		resp, _ := op.GetLogs(param, table.ID)
		if table.V3TableType == db.V3TableTypeJaegerJSON {
			resp.IsTrace = 1
		}
		if len(resp.Logs) > 0 {
			logField := "_raw_log_"
			if table.RawLogField != "" {
				logField = table.RawLogField
			}
			if val, ok := resp.Logs[0][logField]; ok {
				switch val.(type) {
				case string:
					oneTheLogs = val.(string)
				case *string:
					oneTheLogs = *(val.(*string))
				}
			}
		}
	}

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

func SendTestToChannel(c *db.AlarmChannel) (err error) {
	ci, err := push.Instance(c.Typ)
	if err != nil {
		return
	}
	n := view.Notification{}
	a := &db.Alarm{Name: c.Name, Desc: "Test the availability of the alarm channel"}
	err = ci.Send(n, a, c, "")
	return
}
