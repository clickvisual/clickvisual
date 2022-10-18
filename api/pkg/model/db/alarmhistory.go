package db

import (
	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// AlarmHistory 告警渠道
type AlarmHistory struct {
	BaseModel

	AlarmId  int `gorm:"column:alarm_id;type:int(11)" json:"alarmId"`   // alarm id
	IsPushed int `gorm:"column:is_pushed;type:int(11)" json:"isPushed"` // alarm id
}

func (m *AlarmHistory) TableName() string {
	return TableAlarmHistory
}

func AlarmHistoryInfo(db *gorm.DB, id int) (resp AlarmHistory, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmHistory{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "alarm history id: %d", id)
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
