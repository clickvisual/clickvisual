package db

import (
	"fmt"

	"github.com/ego-component/egorm"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// Index 索引数据存储
type Index struct {
	BaseModel

	Tid      int    `gorm:"column:tid;type:int(11);index:uix_tid_field_root,unique" json:"tid"`                          // table id
	Field    string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field_root,unique" json:"field"`        // index field name
	Typ      int    `gorm:"column:typ;type:int(11);NOT NULL" json:"typ"`                                                 // 0 string 1 int 2 float
	HashTyp  int    `gorm:"column:hash_typ;type:tinyint(1)" json:"hashTyp"`                                              // hash type, 0 no hash 1 sipHash64 2 URLHash
	Alias    string `gorm:"column:alias;type:varchar(128);NOT NULL" json:"alias"`                                        // index filed alias name
	RootName string `gorm:"column:root_name;type:varchar(128);NOT NULL;index:uix_tid_field_root,unique" json:"rootName"` // root_name
}

func (t *Index) TableName() string {
	return TableNameIndex
}

func (t *Index) GetFieldName() string {
	if t.RootName == "" {
		return t.Field
	}
	return fmt.Sprintf("%s.%s", t.RootName, t.Field)
}

const (
	HashTypeSip int = 1
	HashTypeURL int = 2
)

func (t *Index) GetHashFieldName() (string, bool) {
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

func IndexInfo(db *gorm.DB, id int) (resp Index, err error) {
	var sql = "`id`= ?"
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
