package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

// Index 索引数据存储
type Index struct {
	Tid   int    `gorm:"column:tid;type:bigint(11)" json:"tid"` // table id
	Field string `gorm:"column:field" db:"field" json:"field" form:"field"`
	Typ   int    `gorm:"column:typ" db:"typ" json:"typ" form:"typ"` // 字段 0 string 1 int 2 float
	Alias string `gorm:"column:alias" db:"alias" json:"alias" form:"alias"`

	BaseModel
}

func (t *Index) TableName() string {
	return TableNameIndex
}

func IndexInfo(db *gorm.DB, id int) (resp Index, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(Index{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func IndexList(conds egorm.Conds) (resp []*Index, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(Index{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func IndexCreate(db *gorm.DB, data *Index) (err error) {
	if err = db.Model(Index{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func IndexUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Index{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func IndexDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(Index{}).Where("`tid`=?", tid).Unscoped().Delete(&Index{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func IndexDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Index{}).Unscoped().Delete(&Index{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
