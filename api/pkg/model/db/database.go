package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// BaseDatabase 数据库管理
type BaseDatabase struct {
	BaseModel

	Iid          int    `gorm:"column:iid;type:int(11);index:uix_iid_name,unique" json:"iid"`                 // datasource instance id
	Name         string `gorm:"column:name;type:varchar(128);index:uix_iid_name,unique;NOT NULL" json:"name"` // datasource database name
	Uid          int    `gorm:"column:uid;type:int(11)" json:"uid"`                                           // datasource operator uid
	Cluster      string `gorm:"column:cluster;type:varchar(128);NOT NULL" json:"cluster"`                     // cluster
	IsCreateByCV int    `gorm:"column:is_create_by_cv;type:tinyint(1)" json:"isCreateByCV"`
	Desc         string `gorm:"column:desc;type:varchar(255)" json:"desc"`

	Instance *BaseInstance `json:"instance,omitempty" gorm:"foreignKey:Iid;references:ID"`
}

func (m *BaseDatabase) TableName() string {
	return TableNameBaseDatabase
}

// DatabaseCreate ...
func DatabaseCreate(db *gorm.DB, data *BaseDatabase) (err error) {
	if err = db.Model(BaseDatabase{}).Create(data).Error; err != nil {
		invoker.Logger.Error("release error", zap.Error(err))
		return
	}
	return
}

// DatabaseDelete Soft delete
func DatabaseDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseDatabase{}).Unscoped().Delete(&BaseDatabase{}, id).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// DatabaseInfoX Info extension method to query a single record according to Cond
func DatabaseInfoX(db *gorm.DB, conds map[string]interface{}) (resp BaseDatabase, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func DatabaseInfo(db *gorm.DB, paramId int) (resp BaseDatabase, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

func DatabaseGetOrCreate(db *gorm.DB, uid, iid int, name string) (resp BaseDatabase, err error) {
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
	resp = BaseDatabase{
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
	if err = db.Table(TableNameBaseDatabase).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

// DatabaseList Get all currently undeleted clusters. Mainly used for front end
func DatabaseList(db *gorm.DB, conds egorm.Conds) (resp []*BaseDatabase, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseDatabase).Preload("BaseInstance").Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
