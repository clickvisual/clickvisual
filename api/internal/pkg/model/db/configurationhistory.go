package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type ConfigurationHistory struct {
	BaseModel
	Uid             int    `gorm:"column:uid;type:int(11) unsigned" json:"uid"`
	ConfigurationId int    `gorm:"column:configuration_id;type:int(11) unsigned" json:"configurationId"`
	ChangeLog       string `gorm:"column:change_log;type:longtext" json:"changeLog"`
	Content         string `gorm:"column:content;type:longtext" json:"content"`
	Version         string `gorm:"column:version;type:varchar(64)" json:"version"`

	Configuration Configuration `json:"configuration,omitempty" gorm:"foreignKey:ConfigurationId;references:ID"`
}

func (m *ConfigurationHistory) TableName() string {
	return TableNameConfigurationHistory
}

// ConfigurationHistoryInfoX get single item by condition
func ConfigurationHistoryInfoX(conds map[string]interface{}) (resp ConfigurationHistory, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameConfigurationHistory).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("ConfigurationHistoryInfoX infoX error", zap.Error(err))
		return
	}
	return
}

// ConfigurationHistoryListPage return item list by pagination
func ConfigurationHistoryListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*ConfigurationHistory) {
	respList = make([]*ConfigurationHistory, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Table(TableNameConfigurationHistory).Where(sql, binds...)
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Order("id DESC").Find(&respList)
	return
}
