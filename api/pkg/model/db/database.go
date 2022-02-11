package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Database 数据库管理
type Database struct {
	Iid  int    `gorm:"column:iid;type:int(11)" json:"iid"`                 // 实例 id
	Name string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // 数据库名称
	Uid  int    `gorm:"column:uid;type:int(11)" json:"uid"`                 // 操作人

	Instance *Instance `json:"instance,omitempty" gorm:"foreignKey:Iid;references:ID"`

	BaseModel
}

func (m *Database) TableName() string {
	return TableNameDatabase
}

// DatabaseCreate ...
func DatabaseCreate(db *gorm.DB, data *Database) (err error) {
	if err = db.Model(Database{}).Create(data).Error; err != nil {
		elog.Error("release error", zap.Error(err))
		return
	}
	return
}

// DatabaseDelete Soft delete
func DatabaseDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Database{}).Unscoped().Delete(&Database{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

// DatabaseInfoX Info extension method to query a single record according to Cond
func DatabaseInfoX(db *gorm.DB, conds map[string]interface{}) (resp Database, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func DatabaseInfo(db *gorm.DB, paramId int) (resp Database, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

// DatabaseUpdate ...
func DatabaseUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameDatabase).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

// DatabaseList Get all currently undeleted clusters. Mainly used for front end
func DatabaseList(db *gorm.DB, conds egorm.Conds) (resp []*Database, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameDatabase).Preload("Instance").Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
