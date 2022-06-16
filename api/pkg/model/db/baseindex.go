package db

import (
	"fmt"

	"github.com/ego-component/egorm"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// BaseIndex 索引数据存储
type BaseIndex struct {
	BaseModel

	Tid      int    `gorm:"column:tid;type:int(11);index:uix_tid_field_root,unique" json:"tid"`                          // table id
	Field    string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field_root,unique" json:"field"`        // index field name
	Typ      int    `gorm:"column:typ;type:int(11);NOT NULL" json:"typ"`                                                 // 0 string 1 int 2 float
	HashTyp  int    `gorm:"column:hash_typ;type:tinyint(1)" json:"hashTyp"`                                              // hash type, 0 no hash 1 sipHash64 2 URLHash
	Alias    string `gorm:"column:alias;type:varchar(128);NOT NULL" json:"alias"`                                        // index filed alias name
	RootName string `gorm:"column:root_name;type:varchar(128);NOT NULL;index:uix_tid_field_root,unique" json:"rootName"` // root_name
}

func (t *BaseIndex) TableName() string {
	return TableNameBaseIndex
}

func (t *BaseIndex) GetFieldName() string {
	if t.RootName == "" {
		return t.Field
	}
	return fmt.Sprintf("%s.%s", t.RootName, t.Field)
}

const (
	HashTypeSip int = 1
	HashTypeURL int = 2
)

func (t *BaseIndex) GetHashFieldName() (string, bool) {
	switch t.HashTyp {
	case 0:
		return "", false
	case HashTypeSip:
		return fmt.Sprintf("_inner_siphash_%s_", t.GetFieldName()), true
	case HashTypeURL:
		return fmt.Sprintf("_inner_urlhash_%s_", t.GetFieldName()), true
	}
	return "", false
}

func IndexInfo(db *gorm.DB, id int) (resp BaseIndex, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(BaseIndex{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func IndexList(conds egorm.Conds) (resp []*BaseIndex, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BaseIndex{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func IndexCreate(db *gorm.DB, data *BaseIndex) (err error) {
	if err = db.Model(BaseIndex{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func IndexUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BaseIndex{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

func IndexDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(BaseIndex{}).Where("`tid`=?", tid).Unscoped().Delete(&BaseIndex{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func IndexDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseIndex{}).Unscoped().Delete(&BaseIndex{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}
