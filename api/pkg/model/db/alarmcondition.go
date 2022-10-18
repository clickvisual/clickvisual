package db

import (
	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// AlarmCondition alarm statement，the trigger condition
type AlarmCondition struct {
	BaseModel

	AlarmId        int `gorm:"column:alarm_id;type:int(11)" json:"alarmId"`              // alarm id
	FilterId       int `gorm:"column:filter_id;type:int(11)" json:"filterId"`            // filter id
	SetOperatorTyp int `gorm:"column:set_operator_typ;type:int(11);NOT NULL" json:"typ"` // 0 WHEN 1 AND 2 OR
	SetOperatorExp int `gorm:"column:set_operator_exp;type:int(11);NOT NULL" json:"exp"` // 0 avg 1 min 2 max 3 sum 4 count
	Cond           int `gorm:"column:cond;type:int(11)" json:"cond"`                     // 0 above 1 below 2 outside range 3 within range
	Val1           int `gorm:"column:val_1;type:int(11)" json:"val1"`                    // 基准值/最小值
	Val2           int `gorm:"column:val_2;type:int(11)" json:"val2"`                    // 最大值
}

func (m *AlarmCondition) TableName() string {
	return TableAlarmCondition
}

func AlarmConditionList(conds egorm.Conds) (resp []*AlarmCondition, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmCondition{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func AlarmConditionCreate(db *gorm.DB, data *AlarmCondition) (err error) {
	if err = db.Model(AlarmCondition{}).Create(data).Error; err != nil {
		return errors.Wrapf(err, "alarm condition: %v", data)
	}
	return
}

func AlarmConditionDeleteBatch(db *gorm.DB, alarmId int) (err error) {
	if err = db.Model(AlarmCondition{}).Where("`alarm_id`=?", alarmId).Unscoped().Delete(&AlarmCondition{}).Error; err != nil {
		return errors.Wrapf(err, "alarm id: %d", alarmId)
	}
	return
}
