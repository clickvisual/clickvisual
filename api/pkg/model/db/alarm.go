package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

// Alarm 告警配置
type Alarm struct {
	Tid       int    `gorm:"column:tid;type:int(11)" json:"tid"`                 // table id
	Uuid      string `gorm:"column:uuid;type:varchar(128);NOT NULL" json:"uuid"` // 唯一外键
	Name      string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // 告警名称
	Desc      string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // 描述说明
	Interval  int    `gorm:"column:interval;type:int(11)" json:"interval"`       // 告警频率
	Unit      int    `gorm:"column:unit;type:int(11)" json:"unit"`               // 0 m 1 s 2 h 3 d 4 w 5 y
	AlertRule string `gorm:"column:alert_rule;type:text" json:"alert_rule"`      // prometheus alert rule
	View      string `gorm:"column:view;type:text" json:"view"`                  // 数据转换视图

	BaseModel
}

func (m *Alarm) TableName() string {
	return TableMogoAlarm
}

func AlarmInfo(db *gorm.DB, id int) (resp Alarm, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(Alarm{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmList(conds egorm.Conds) (resp []*Alarm, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(Alarm{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmCreate(db *gorm.DB, data *Alarm) (err error) {
	if err = db.Model(Alarm{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Alarm{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(Alarm{}).Where("`tid`=?", tid).Unscoped().Delete(&Alarm{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Alarm{}).Unscoped().Delete(&Alarm{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

// AlarmFilter 告警过滤条件
type AlarmFilter struct {
	AlarmId        int    `gorm:"column:alarm_id;type:int(11)" json:"alarm_id"`                               // alarm id
	When           string `gorm:"column:when;type:text" json:"when"`                                          // 执行条件
	SetOperatorTyp int    `gorm:"column:set_operator_typ;type:int(11);NOT NULL" json:"set_operator_typ"`      // 0 不合并 1 笛卡尔积 2 拼接 3 内联 4 左联 5 右连 7 全连 8 左斥 9 右斥
	SetOperatorExp string `gorm:"column:set_operator_exp;type:varchar(255);NOT NULL" json:"set_operator_exp"` // 操作

	BaseModel
}

func (m *AlarmFilter) TableName() string {
	return TableMogoAlarmFilter
}

func AlarmFilterInfo(db *gorm.DB, id int) (resp AlarmFilter, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(AlarmFilter{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterList(conds egorm.Conds) (resp []*AlarmFilter, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmFilter{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterCreate(db *gorm.DB, data *AlarmFilter) (err error) {
	if err = db.Model(AlarmFilter{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmFilter{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterDeleteBatch(db *gorm.DB, alarmId int) (err error) {
	if err = db.Model(AlarmFilter{}).Where("`alarm_id`=?", alarmId).Unscoped().Delete(&AlarmFilter{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmFilterDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmFilter{}).Unscoped().Delete(&AlarmFilter{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

// AlarmCondition 告警触发条件
type AlarmCondition struct {
	AlarmId int    `gorm:"column:alarm_id;type:int(11)" json:"alarm_id"` // alarm id
	Exp     string `gorm:"column:exp;type:text" json:"exp"`              // 0 avg 1 min 2 max 3 sum 4 count
	Cond    int    `gorm:"column:cond;type:int(11)" json:"cond"`         // 0 above 1 below 2 outside range 3 within range
	Val1    int    `gorm:"column:val_1;type:int(11)" json:"val_1"`       // 基准值/最小值
	Val2    int    `gorm:"column:val_2;type:int(11)" json:"val_2"`       // 最大值

	BaseModel
}

func (m *AlarmCondition) TableName() string {
	return TableMogoAlarmConditions
}

func AlarmConditionInfo(db *gorm.DB, id int) (resp AlarmCondition, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(AlarmCondition{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionList(conds egorm.Conds) (resp []*AlarmCondition, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmCondition{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionCreate(db *gorm.DB, data *AlarmCondition) (err error) {
	if err = db.Model(AlarmCondition{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmCondition{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionDeleteBatch(db *gorm.DB, alarmId int) (err error) {
	if err = db.Model(AlarmCondition{}).Where("`alarm_id`=?", alarmId).Unscoped().Delete(&AlarmCondition{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func AlarmConditionDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmCondition{}).Unscoped().Delete(&AlarmCondition{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
