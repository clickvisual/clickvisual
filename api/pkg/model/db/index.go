package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

// Index 索引数据存储
type Index struct {
	BaseModel

	Tid      int    `gorm:"column:tid;type:int(11);index:uix_tid_field,unique" json:"tid"`                   // table id
	Field    string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field,unique" json:"field"` // 字段
	Typ      int    `gorm:"column:typ;type:int(11);NOT NULL" json:"typ"`                                     // 字段 0 text 1 long 2 double
	Alias    string `gorm:"column:alias;type:varchar(128);NOT NULL" json:"alias"`                            // 别名
	RootName string `gorm:"column:root_name;type:varchar(128);NOT NULL" json:"rootName"`                     // root_name
}

func (t *Index) TableName() string {
	return TableNameIndex
}

func IndexInfo(db *gorm.DB, id int) (resp Index, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(Index{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func IndexList(conds egorm.Conds) (resp []*Index, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(Index{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func IndexCreate(db *gorm.DB, data *Index) (err error) {
	if err = db.Model(Index{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func IndexUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Index{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func IndexDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(Index{}).Where("`tid`=?", tid).Unscoped().Delete(&Index{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func IndexDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Index{}).Unscoped().Delete(&Index{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}
