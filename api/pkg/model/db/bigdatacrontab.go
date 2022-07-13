package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	CrontabTypNormal int = iota
	CrontabTypSuspended
)

const (
	CrontabStatusWait int = iota
	CrontabStatusPreempt
	CrontabStatusDoing
)

func (m *BigdataCrontab) TableName() string {
	return TableNameBigDataCrontab
}

type BigdataCrontab struct {
	NodeId  int    `gorm:"column:node_id;type:int(11);uix_node_id,unique" json:"nodeId"`
	Desc    string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	DutyUid int    `gorm:"column:duty_uid;type:int(11)" json:"dutyUid"`        // person in charge
	Cron    string `gorm:"column:cron;type:varchar(255);NOT NULL" json:"cron"` // cron expression
	Typ     int    `gorm:"column:typ;type:int(11)" json:"typ"`                 // typ 0 Normal scheduling 1 Suspended scheduling
	Status  int    `gorm:"column:status;type:int(11)" json:"status"`           // status 0 default 1 preempt 2 doing
	Uid     int    `gorm:"column:uid;type:int(11)" json:"uid"`
	Ctime   int64  `gorm:"bigint;autoCreateTime;comment:创建时间" json:"ctime"`
	Utime   int64  `gorm:"bigint;autoUpdateTime;comment:更新时间" json:"utime"`
}

func CrontabInfo(db *gorm.DB, nodeId int) (resp BigdataCrontab, err error) {
	var sql = "`node_id`= ?"
	var binds = []interface{}{nodeId}
	if err = db.Model(BigdataCrontab{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func CrontabList(conds egorm.Conds) (resp []*BigdataCrontab, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataCrontab{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func CrontabCreate(db *gorm.DB, data *BigdataCrontab) (err error) {
	if err = db.Model(BigdataCrontab{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func CrontabUpdate(db *gorm.DB, nodeId int, ups map[string]interface{}) (err error) {
	var sql = "`node_id`=?"
	var binds = []interface{}{nodeId}
	if err = db.Model(BigdataCrontab{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func CrontabDelete(db *gorm.DB, nodeId int) (err error) {
	if err = db.Where("node_id=?", nodeId).Model(BigdataCrontab{}).Delete(&BigdataCrontab{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}
