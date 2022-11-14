package service

import (
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/alert/pusher"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func (i *alert) PushAlertManager(alarmUUID string, filterId string, notification db.Notification) (err error) {
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
	var currentStatus int
	if notification.Status == "firing" {
		currentStatus = db.AlarmStatusFiring
	} else if notification.Status == "resolved" {
		currentStatus = db.AlarmStatusOpen
	}
	if alarmObj.Status == currentStatus {
		invoker.Logger.Info("PushAlertManagerRepeat", elog.Int("currentStatus", currentStatus), elog.String("filterId", filterId), elog.String("alarmUUID", alarmUUID))
		return nil
	}
	if err = alarmObj.StatusUpdate(currentStatus); err != nil {
		return err
	}
	// get alarm filter info
	filter, err := i.compatibleFilter(alarmObj.ID, filterId)
	if err != nil {
		return
	}
	// get table info
	tableInfo, err := db.TableInfo(invoker.Db, filter.Tid)
	if err != nil {
		return
	}
	if tableInfo.TimeField == "" {
		tableInfo.TimeField = db.TimeFieldSecond
	}
	// get op
	op, err := InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		return
	}
	// get partial log
	partialLog := i.getPartialLog(op, &tableInfo, &alarmObj, filter)
	for _, channelId := range alarmObj.ChannelIds {
		channelInfo, errAlarmChannelInfo := db.AlarmChannelInfo(invoker.Db, channelId)
		if errAlarmChannelInfo != nil {
			return errAlarmChannelInfo
		}
		channelInstance, errChannelType := pusher.GetPusher(channelInfo.Typ)
		if errChannelType != nil {
			return errChannelType
		}
		errSend := channelInstance.Send(notification, &tableInfo, &alarmObj, filter, &channelInfo, partialLog)
		if errSend != nil {
			return errSend
		}
	}
	if err = db.AlarmHistoryUpdate(invoker.Db, alarmHistory.ID, map[string]interface{}{"is_pushed": 1}); err != nil {
		return err
	}
	return nil
}

func (i *alert) compatibleFilter(alarmId int, filterIdStr string) (res *db.AlarmFilter, err error) {
	if filterIdStr == "" {
		condsFilter := egorm.Conds{}
		condsFilter["alarm_id"] = alarmId
		filters, errAlarmFilterList := db.AlarmFilterList(condsFilter)
		if errAlarmFilterList != nil {
			return nil, errAlarmFilterList
		}
		if len(filters) == 0 {
			return nil, errors.New("empty alarm filter")
		}
		res = filters[0]
	} else {
		filterId, _ := strconv.Atoi(filterIdStr)
		filter, errAlarmFilterInfo := db.AlarmFilterInfo(invoker.Db, filterId)
		if errAlarmFilterInfo != nil {
			return nil, errAlarmFilterInfo
		}
		res = &filter
	}
	return
}

func (i *alert) getPartialLog(op inquiry.Operator, table *db.BaseTable, alarm *db.Alarm, filter *db.AlarmFilter) (partialLog string) {
	param := view.ReqQuery{
		Tid:           table.ID,
		Database:      table.Database.Name,
		Table:         table.Name,
		Query:         filter.When,
		AlarmMode:     filter.Mode,
		TimeField:     table.TimeField,
		TimeFieldType: table.TimeFieldType,
		ST:            time.Now().Add(-db.UnitMap[alarm.Unit].Duration - time.Minute).Unix(),
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
		l, _ := json.Marshal(resp.Logs[0])
		partialLog = string(l)
	}
	return partialLog
}
