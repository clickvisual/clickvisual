package db

import (
	"fmt"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

// Alarm defines alarm table structure
type Alarm struct {
	BaseModel

	Tid           int           `gorm:"column:tid;type:int(11)" json:"tid"`                                                    // table id
	Uuid          string        `gorm:"column:uuid;type:varchar(128);NOT NULL" json:"uuid"`                                    // foreign key
	Name          string        `gorm:"column:name;type:varchar(128);NOT NULL" json:"alarmName"`                               // name of an alarm
	Desc          string        `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"`                                    // description
	Interval      int           `gorm:"column:interval;type:int(11)" json:"interval"`                                          // interval second between alarm
	Unit          int           `gorm:"column:unit;type:int(11)" json:"unit"`                                                  // 0 m 1 s 2 h 3 d 4 w 5 y
	AlertRule     string        `gorm:"column:alert_rule;type:text" json:"alertRule"`                                          // prometheus alert rule
	View          string        `gorm:"column:view;type:text" json:"view"`                                                     // view table ddl
	ViewTableName string        `gorm:"column:view_table_name;type:varchar(255)" json:"viewTableName"`                         // name of view table
	Tags          String2String `gorm:"column:tag;type:text" json:"tag"`                                                       // tags
	Uid           int           `gorm:"column:uid;type:int(11)" json:"uid"`                                                    // uid of alarm operator
	Status        int           `gorm:"column:status;type:int(11)" json:"status"`                                              // status
	RuleStoreType int           `gorm:"column:rule_store_type" db:"rule_store_type" json:"ruleStoreType" form:"ruleStoreType"` // ruleStoreType
	ChannelIds    Ints          `gorm:"column:channel_ids;type:varchar(255);NOT NULL" json:"channelIds"`                       // channel of an alarm
}

func (m *Alarm) TableName() string {
	return TableMogoAlarm
}

func (m *Alarm) AlertRuleName() string {
	return fmt.Sprintf("mogo-%s.yaml", m.Uuid)
}

const (
	AlarmStatusClose = iota + 1
	AlarmStatusOpen
	AlarmStatusFiring
)

var unitMap = map[int]string{
	0: "m",
	1: "s",
	2: "h",
	3: "d",
	4: "w",
	5: "y",
}

func (m *Alarm) AlertInterval() string {
	return fmt.Sprintf("%d%s", m.Interval, unitMap[m.Unit])
}

func GetAlarmTableInstanceInfo(id int) (instanceInfo Instance, tableInfo Table, alarmInfo Alarm, err error) {
	alarmInfo, err = AlarmInfo(invoker.Db, id)
	if err != nil {
		return
	}
	// table info
	tableInfo, err = TableInfo(invoker.Db, alarmInfo.Tid)
	if err != nil {
		invoker.Logger.Error("alarm", elog.String("step", "alarm table info"), elog.String("err", err.Error()))
		return
	}
	// prometheus set
	instanceInfo, err = InstanceInfo(invoker.Db, tableInfo.Database.Iid)
	if err != nil {
		invoker.Logger.Error("alarm", elog.String("step", "you need to configure alarms related to the instance first:"), elog.String("err", err.Error()))
		return
	}
	return
}

func AlarmStatusUpdate(id int, status string) (err error) {
	ups := make(map[string]interface{}, 0)
	if status == "firing" {
		ups["status"] = AlarmStatusFiring
	} else if status == "resolved" {
		ups["status"] = AlarmStatusOpen
	}
	err = AlarmUpdate(invoker.Db, id, ups)
	if err != nil {
		return
	}
	return
}

func AlarmInfo(db *gorm.DB, id int) (resp Alarm, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(Alarm{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmInfoX(db *gorm.DB, conds map[string]interface{}) (resp Alarm, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Model(Alarm{}).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func AlarmList(conds egorm.Conds) (resp []*Alarm, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(Alarm{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

// AlarmListPage return item list by pagination
func AlarmListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*Alarm) {
	respList = make([]*Alarm, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Model(Alarm{}).Where(sql, binds...).Order("utime desc")
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func AlarmListByDidPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*Alarm) {
	respList = make([]*Alarm, 0)
	conds["mogo_alarm.dtime"] = 0
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Select("*, mogo_alarm.id as id").Model(Alarm{}).Joins("JOIN mogo_base_table ON mogo_alarm.tid = mogo_base_table.id").Where(sql, binds...)
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func AlarmCreate(db *gorm.DB, data *Alarm) (err error) {
	if err = db.Model(Alarm{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Alarm{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(Alarm{}).Where("`tid`=?", tid).Unscoped().Delete(&Alarm{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Alarm{}).Unscoped().Delete(&Alarm{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

// AlarmFilter 告警过滤条件
type AlarmFilter struct {
	BaseModel

	Tid            int    `gorm:"column:tid;type:int(11)" json:"tid"`                            // table id
	AlarmId        int    `gorm:"column:alarm_id;type:int(11)" json:"alarmId"`                   // alarm id
	When           string `gorm:"column:when;type:text" json:"when"`                             // 执行条件
	SetOperatorTyp int    `gorm:"column:set_operator_typ;type:int(11);NOT NULL" json:"typ"`      // 0 default 1 INNER 2 LEFT OUTER 3 RIGHT OUTER 4 FULL OUTER 5 CROSS
	SetOperatorExp string `gorm:"column:set_operator_exp;type:varchar(255);NOT NULL" json:"exp"` // 操作
}

func (m *AlarmFilter) TableName() string {
	return TableMogoAlarmFilter
}

func AlarmFilterInfo(db *gorm.DB, id int) (resp AlarmFilter, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmFilter{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterList(conds egorm.Conds) (resp []*AlarmFilter, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmFilter{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterCreate(db *gorm.DB, data *AlarmFilter) (err error) {
	if err = db.Model(AlarmFilter{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmFilter{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterDeleteBatch(db *gorm.DB, alarmId int) (err error) {
	if err = db.Model(AlarmFilter{}).Where("`alarm_id`=?", alarmId).Unscoped().Delete(&AlarmFilter{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmFilter{}).Unscoped().Delete(&AlarmFilter{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

// AlarmCondition 告警触发条件
type AlarmCondition struct {
	BaseModel

	AlarmId        int `gorm:"column:alarm_id;type:int(11)" json:"alarmId"`              // alarm id
	SetOperatorTyp int `gorm:"column:set_operator_typ;type:int(11);NOT NULL" json:"typ"` // 0 WHEN 1 AND 2 OR
	SetOperatorExp int `gorm:"column:set_operator_exp;type:int(11);NOT NULL" json:"exp"` // 0 avg 1 min 2 max 3 sum 4 count
	Cond           int `gorm:"column:cond;type:int(11)" json:"cond"`                     // 0 above 1 below 2 outside range 3 within range
	Val1           int `gorm:"column:val_1;type:int(11)" json:"val1"`                    // 基准值/最小值
	Val2           int `gorm:"column:val_2;type:int(11)" json:"val2"`                    // 最大值
}

func (m *AlarmCondition) TableName() string {
	return TableMogoAlarmCondition
}

func AlarmConditionInfo(db *gorm.DB, id int) (resp AlarmCondition, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmCondition{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionList(conds egorm.Conds) (resp []*AlarmCondition, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmCondition{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionCreate(db *gorm.DB, data *AlarmCondition) (err error) {
	if err = db.Model(AlarmCondition{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmCondition{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionDeleteBatch(db *gorm.DB, alarmId int) (err error) {
	if err = db.Model(AlarmCondition{}).Where("`alarm_id`=?", alarmId).Unscoped().Delete(&AlarmCondition{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmCondition{}).Unscoped().Delete(&AlarmCondition{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

// AlarmChannel 告警渠道
type AlarmChannel struct {
	BaseModel

	Name string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // 告警渠道名称
	Key  string `gorm:"column:key;type:text" json:"key"`                    // 关键信息
	Typ  int    `gorm:"column:typ;type:int(11)" json:"typ"`                 // 告警类型：0 dd
	Uid  int    `gorm:"column:uid;type:int(11)" json:"uid"`                 // 操作人
}

func (m *AlarmChannel) TableName() string {
	return TableMogoAlarmChannel
}

func AlarmChannelInfo(db *gorm.DB, id int) (resp AlarmChannel, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmChannel{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelList(conds egorm.Conds) (resp []*AlarmChannel, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmChannel{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelCreate(db *gorm.DB, data *AlarmChannel) (err error) {
	if err = db.Model(AlarmChannel{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmChannel{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(AlarmChannel{}).Where("`tid`=?", tid).Unscoped().Delete(&AlarmChannel{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmChannel{}).Unscoped().Delete(&AlarmChannel{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

// AlarmHistory 告警渠道
type AlarmHistory struct {
	BaseModel

	AlarmId  int `gorm:"column:alarm_id;type:int(11)" json:"alarmId"`   // alarm id
	IsPushed int `gorm:"column:is_pushed;type:int(11)" json:"isPushed"` // alarm id
}

func (m *AlarmHistory) TableName() string {
	return TableMogoAlarmHistory
}

func AlarmHistoryInfo(db *gorm.DB, id int) (resp AlarmHistory, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmHistory{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmHistoryList(conds egorm.Conds) (resp []*AlarmHistory, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmHistory{}).Where(sql, binds...).Order("id desc").Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmHistoryPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*AlarmHistory) {
	respList = make([]*AlarmHistory, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Model(AlarmHistory{}).Where(sql, binds...).Order("utime desc")
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func AlarmHistoryCreate(db *gorm.DB, data *AlarmHistory) (err error) {
	if err = db.Model(AlarmHistory{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmHistoryUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmHistory{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmHistoryDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(AlarmHistory{}).Where("`tid`=?", tid).Unscoped().Delete(&AlarmHistory{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmHistoryDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmHistory{}).Unscoped().Delete(&AlarmHistory{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}
