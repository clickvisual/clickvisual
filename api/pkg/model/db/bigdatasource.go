package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (m *BigdataSource) TableName() string {
	return TableNameBigDataSource
}

type BigdataSource struct {
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
	SourceTypMySQL      = 1
	SourceTypClickHouse = 2
)

func SourceInfo(db *gorm.DB, id int) (resp BigdataSource, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataSource{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func SourceList(conds egorm.Conds) (resp []*BigdataSource, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataSource{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func SourceCreate(db *gorm.DB, data *BigdataSource) (err error) {
	if err = db.Model(BigdataSource{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func SourceUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataSource{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func SourceDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataSource{}).Delete(&BigdataSource{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}
