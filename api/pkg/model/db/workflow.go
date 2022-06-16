package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (m *BigdataWorkflow) TableName() string {
	return TableNameBigDataWorkflow
}

type BigdataWorkflow struct {
	BaseModel

	Iid  int    `gorm:"column:iid;type:int(11)" json:"iid"`
	Name string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // name of an alarm
	Desc string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	Uid  int    `gorm:"column:uid;type:int(11)" json:"uid"`
}

func WorkflowInfo(db *gorm.DB, id int) (resp BigdataWorkflow, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataWorkflow{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func WorkflowList(conds egorm.Conds) (resp []*BigdataWorkflow, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataWorkflow{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func WorkflowCreate(db *gorm.DB, data *BigdataWorkflow) (err error) {
	if err = db.Model(BigdataWorkflow{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func WorkflowUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataWorkflow{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func WorkflowDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataWorkflow{}).Delete(&BigdataWorkflow{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}
