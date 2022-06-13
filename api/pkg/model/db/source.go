package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (m *Source) TableName() string {
	return TableNameBigDataSource
}

type Source struct {
	BaseModel

	Iid      int    `gorm:"column:iid;type:int(11)" json:"iid"`
	Name     string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // name of an alarm
	Desc     string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	URL      string `gorm:"column:url;type:varchar(255);NOT NULL" json:"url"`
	UserName string `gorm:"column:username;type:varchar(255);NOT NULL" json:"username"`
	Password string `gorm:"column:password;type:varchar(255);NOT NULL" json:"password"`
	Typ      int    `gorm:"column:typ;type:int(11)" json:"typ"`
	Uid      int    `gorm:"column:uid;type:int(11)" json:"uid"`
}

const (
	SourceTypClickHouse = 1
	SourceTypMySQL      = 2
)

func SourceInfo(db *gorm.DB, id int) (resp Source, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(Source{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func SourceList(conds egorm.Conds) (resp []*Source, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(Source{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func SourceCreate(db *gorm.DB, data *Source) (err error) {
	if err = db.Model(Source{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func SourceUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Source{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func SourceDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Source{}).Delete(&Source{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}
