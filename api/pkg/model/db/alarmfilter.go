package db

import (
	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type AlarmFilter struct {
	BaseModel

	Tid            int    `gorm:"column:tid;type:int(11)" json:"tid"`                            // table id
	AlarmId        int    `gorm:"column:alarm_id;type:int(11)" json:"alarmId"`                   // alarm id
	When           string `gorm:"column:when;type:text" json:"when"`                             // 执行条件
	SetOperatorTyp int    `gorm:"column:set_operator_typ;type:int(11);NOT NULL" json:"typ"`      // 0 default 1 INNER 2 LEFT OUTER 3 RIGHT OUTER 4 FULL OUTER 5 CROSS
	SetOperatorExp string `gorm:"column:set_operator_exp;type:varchar(255);NOT NULL" json:"exp"` // 操作
	Mode           int    `gorm:"column:mode;type:int(11)" json:"mode"`                          // 0 m 1 s 2 h 3 d 4 w 5 y
}

func (m *AlarmFilter) TableName() string {
	return TableNameAlarmFilter
}

func AlarmFilterList(conds egorm.Conds) (resp []*AlarmFilter, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmFilter{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func AlarmFilterCreate(db *gorm.DB, data *AlarmFilter) (err error) {
	if err = db.Model(AlarmFilter{}).Create(data).Error; err != nil {
		return errors.Wrapf(err, "alarm filter: %v", data)
	}
	return
}

func AlarmFilterDeleteBatch(db *gorm.DB, alarmId int) (err error) {
	if err = db.Model(AlarmFilter{}).Where("`alarm_id`=?", alarmId).Unscoped().Delete(&AlarmFilter{}).Error; err != nil {
		return errors.Wrapf(err, "alarm id: %d", alarmId)
	}
	return
}
