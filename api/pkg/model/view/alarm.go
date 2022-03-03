package view

import (
	"github.com/shimohq/mogo/api/pkg/model/db"
)

type ReqAlarmCreate struct {
	Name       string                    `json:"alarmName" from:"alarmName" binding:"required"` // 告警名称
	Desc       string                    `json:"desc" from:"desc"`                              // 描述说明
	Interval   int                       `json:"interval" from:"interval" binding:"required"`   // 告警频率
	Unit       int                       `json:"unit" from:"unit"`                              // 0 m 1 s 2 h 3 d 4 w 5 y
	AlertRule  string                    `json:"alertRule" from:"alertRule"`                    // prometheus alert rule
	View       string                    `json:"view" from:"view"`                              // 数据转换视图
	Tags       map[string]string         `json:"tags" from:"tags"`                              //
	Filters    []ReqAlarmFilterCreate    `json:"filters" from:"filters"`
	Conditions []ReqAlarmConditionCreate `json:"conditions" from:"conditions"`
}

type ReqAlarmFilterCreate struct {
	Tid            int    `json:"tid" from:"tid" binding:"required"`
	When           string `json:"when" from:"when" binding:"required"` // 执行条件
	SetOperatorTyp int    `json:"typ" from:"typ"`                      // 0 default 1 INNER 2 LEFT OUTER 3 RIGHT OUTER 4 FULL OUTER 5 CROSS
	SetOperatorExp string `json:"exp" from:"exp"`                      // 操作
}

type ReqAlarmConditionCreate struct {
	SetOperatorTyp int `json:"typ" from:"typ"`                      // 0 when 1 and  2 or
	SetOperatorExp int `json:"exp" from:"exp"`                      // 0 avg 1 min 2 max 3 sum 4 count
	Cond           int `json:"cond" from:"cond"`                    // 0 above 1 below 2 outside range 3 within range
	Val1           int `json:"val1" from:"val1" binding:"required"` // 基准值/最小值
	Val2           int `json:"val2" from:"val2"`                    // 最大值
}

type ReqAlarmInfo struct {
	db.Alarm
	Filters    []*db.AlarmFilter    `json:"filters" from:"filters"`
	Conditions []*db.AlarmCondition `json:"conditions" from:"conditions"`
	db.User
}
