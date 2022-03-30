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
	BaseModel

	Iid            int       `gorm:"column:iid;type:int(11);index:uix_iid_name,unique" json:"iid"`                 // datasource instance id
	Name           string    `gorm:"column:name;type:varchar(128);index:uix_iid_name,unique;NOT NULL" json:"name"` // datasource database name
	Uid            int       `gorm:"column:uid;type:int(11)" json:"uid"`                                           // datasource operator uid
	Cluster        string    `gorm:"column:cluster;type:varchar(128);NOT NULL" json:"cluster"`                     // cluster
	IsCreateByMogo int       `gorm:"column:is_create_by_mogo;type:tinyint(1)" json:"isCreateByMogo"`
	Instance       *Instance `json:"instance,omitempty" gorm:"foreignKey:Iid;references:ID"`
}

func (m *Database) TableName() string {
	return TableNameDatabase
}

// DatabaseCreate ...
func DatabaseCreate(db *gorm.DB, data *Database) (err error) {
	if err = db.Model(Database{}).Create(data).Error; err != nil {
		invoker.Logger.Error("release error", zap.Error(err))
		return
	}
	return
}

// DatabaseDelete Soft delete
func DatabaseDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Database{}).Unscoped().Delete(&Database{}, id).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// DatabaseInfoX Info extension method to query a single record according to Cond
func DatabaseInfoX(db *gorm.DB, conds map[string]interface{}) (resp Database, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func DatabaseInfo(db *gorm.DB, paramId int) (resp Database, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

func DatabaseGetOrCreate(db *gorm.DB, uid, iid int, name string) (resp Database, err error) {
	conds := egorm.Conds{}
	conds["iid"] = iid
	conds["name"] = name
	d, err := DatabaseInfoX(db, conds)
	if err != nil && err != gorm.ErrRecordNotFound {
		return
	}
	if d.ID != 0 {
		return d, nil
	}
	// create
	resp = Database{
		Iid:  iid,
		Name: name,
		Uid:  uid,
	}
	if err = DatabaseCreate(db, &resp); err != nil {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

// DatabaseUpdate ...
func DatabaseUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameDatabase).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

// DatabaseList Get all currently undeleted clusters. Mainly used for front end
func DatabaseList(db *gorm.DB, conds egorm.Conds) (resp []*Database, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameDatabase).Preload("Instance").Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
