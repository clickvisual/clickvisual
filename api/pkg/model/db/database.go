package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

// Database 数据库管理
type Database struct {
	Id    int64  `gorm:"column:id;type:bigint(20);primary_key;AUTO_INCREMENT" json:"id"` // id
	Iid   int    `gorm:"column:iid;type:int(11)" json:"iid"`                             // 实例 id
	Name  string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`             // 数据库名称
	Uid   int    `gorm:"column:uid;type:int(11)" json:"uid"`                             // 操作人
	Ctime int    `gorm:"column:ctime;type:int(11)" json:"ctime"`                         // 创建时间
	Utime int    `gorm:"column:utime;type:int(11)" json:"utime"`                         // 更新时间
	Dtime int    `gorm:"column:dtime;type:int(11)" json:"dtime"`                         // 删除时间
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
func DatabaseInfoX(conds map[string]interface{}) (resp Database, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
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
	if err = db.Table(TableNameDatabase).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
