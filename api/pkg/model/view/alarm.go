package view

import (
	"time"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type ReqAlarmCreate struct {
	Name       string                    `json:"alarmName" form:"alarmName"` // 告警名称
	Desc       string                    `json:"desc" form:"desc"`           // 描述说明
	Interval   int                       `json:"interval" form:"interval"`   // 告警频率
	Unit       int                       `json:"unit" form:"unit"`           // 0 m 1 s 2 h 3 d 4 w 5 y
	Status     int                       `json:"status" form:"status"`
	AlertRule  string                    `json:"alertRule" form:"alertRule"` // prometheus alert rule
	View       string                    `json:"view" form:"view"`           // 数据转换视图
	NoDataOp   int                       `json:"noDataOp" form:"noDataOp"`
	Tags       map[string]string         `json:"tags" form:"tags"` //
	ChannelIds []int                     `json:"channelIds" form:"channelIds"`
	Filters    []ReqAlarmFilterCreate    `json:"filters" form:"filters"`
	Conditions []ReqAlarmConditionCreate `json:"conditions" form:"conditions"`
	Mode       int                       `json:"mode" form:"mode"`
	Level      int                       `json:"level" form:"level"`
}

func (r *ReqAlarmCreate) ConvertV2() {
	if len(r.Conditions) == 0 {
		return
	}
	if len(r.Filters) == 1 {
		r.Filters[0].Conditions = r.Conditions
	}
}

type AlarmFilterItem struct {
	*db.AlarmFilter
	Exp string
}

type ReqAlarmFilterCreate struct {
	Tid            int    `json:"tid" form:"tid" binding:"required"`
	When           string `json:"when" form:"when" binding:"required"` // 执行条件
	SetOperatorTyp int    `json:"typ" form:"typ"`                      // 0 default 1 INNER 2 LEFT OUTER 3 RIGHT OUTER 4 FULL OUTER 5 CROSS
	SetOperatorExp string `json:"exp" form:"exp"`                      // 操作
	Mode           int    `json:"mode" form:"mode"`
	Conditions     []ReqAlarmConditionCreate
}

type ReqAlarmConditionCreate struct {
	SetOperatorTyp int `json:"typ" form:"typ"`                      // 0 when 1 and  2 or
	SetOperatorExp int `json:"exp" form:"exp"`                      // 0 avg 1 min 2 max 3 sum 4 count
	Cond           int `json:"cond" form:"cond"`                    // 0 above 1 below 2 outside range 3 within range
	Val1           int `json:"val1" form:"val1" binding:"required"` // 基准值/最小值
	Val2           int `json:"val2" form:"val2"`                    // 最大值
}

type RespAlarmInfo struct {
	Filters    []*db.AlarmFilter    `json:"filters" form:"filters"`
	Conditions []*db.AlarmCondition `json:"conditions" form:"conditions"`
	Ctime      int64                `json:"ctime"`
	Utime      int64                `json:"utime"`
	db.Alarm
	db.User
	Table    db.BaseTable    `json:"table"`
	Instance db.BaseInstance `json:"instance"`
}

type (
	ReqAlarmHistoryList struct {
		AlarmId   int `json:"alarmId" form:"alarmId"`
		StartTime int `json:"startTime" form:"startTime"`
		EndTime   int `json:"endTime" form:"endTime"` // 0 m 1 s 2 h 3 d 4 w 5 y
		db.ReqPage
	}

	RespAlarmHistoryList struct {
		Total int64              `json:"total"`
		Succ  int64              `json:"succ"`
		List  []*db.AlarmHistory `json:"list"`
	}
)

type (
	RespAlarmList struct {
		*db.Alarm
		TableName    string `json:"tableName"`
		TableDesc    string `json:"tableDesc"`
		Tid          int    `json:"tid"`
		DatabaseName string `json:"databaseName"`
		DatabaseDesc string `json:"databaseDesc"`
		Did          int    `json:"did"`
		InstanceName string `json:"instanceName"`
		InstanceDesc string `json:"instanceDesc"`
		Iid          int    `json:"iid"`
	}

	Alert struct {
		Labels      map[string]string `json:"labels"`
		Annotations map[string]string `json:"annotations"`
		StartsAt    time.Time         `json:"startsAt"`
		EndsAt      time.Time         `json:"endsAt"`
	}

	Notification struct {
		Version           string            `json:"version"`
		GroupKey          string            `json:"groupKey"`
		Status            string            `json:"status"`
		Receiver          string            `json:"receiver"`
		GroupLabels       map[string]string `json:"groupLabels"`
		CommonLabels      map[string]string `json:"commonLabels"`
		CommonAnnotations map[string]string `json:"commonAnnotations"`
		ExternalURL       string            `json:"externalURL"`
		Alerts            []Alert           `json:"alerts"`
	}

	At struct {
		AtMobiles []string `json:"atMobiles"`
		IsAtAll   bool     `json:"isAtAll"`
	}

	DingTalkMarkdown struct {
		MsgType  string    `json:"msgtype"`
		At       *At       `json:"at"`
		Markdown *Markdown `json:"markdown"`
	}

	Markdown struct {
		Title string `json:"title"`
		Text  string `json:"text"`
	}
)
