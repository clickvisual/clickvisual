package db

import (
	"fmt"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	IndexTypeString int = 0
	IndexTypeRaw    int = -4
)

const (
	IndexKindBase int = 0
	IndexKindLog  int = 1
)

// BaseIndex 索引数据存储
type BaseIndex struct {
	BaseModel

	Tid      int    `gorm:"column:tid;type:int(11);index:uix_tid_field_root,unique" json:"tid"`                         // table id
	Field    string `gorm:"column:field;type:varchar(64);NOT NULL;index:uix_tid_field_root,unique" json:"field"`        // index field name
	RootName string `gorm:"column:root_name;type:varchar(64);NOT NULL;index:uix_tid_field_root,unique" json:"rootName"` // root_name
	Typ      int    `gorm:"column:typ;type:int(11);NOT NULL" json:"typ"`                                                // 0 string 1 int 2 float
	HashTyp  int    `gorm:"column:hash_typ;type:tinyint(1)" json:"hashTyp"`                                             // hash type, 0 no hash 1 sipHash64 2 URLHash
	Alias    string `gorm:"column:alias;type:varchar(128);NOT NULL" json:"alias"`                                       // index filed alias name
	Kind     int    `gorm:"column:kind;type:tinyint(1)" json:"kind"`                                                    // 0 base field 1 log field
}

func (b *BaseIndex) TableName() string {
	return TableNameBaseIndex
}

func (t *BaseIndex) GetFieldName() string {
	if t.RootName == "" {
		return t.Field
	}
	return fmt.Sprintf("%s.%s", t.RootName, t.Field)
}

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
		err = errors.Wrapf(err, "index id: %d", id)
		return
	}
	return
}

func IndexList(conds egorm.Conds) (resp []*BaseIndex, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BaseIndex{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func IndexCreate(db *gorm.DB, data *BaseIndex) (err error) {
	if err = db.Model(BaseIndex{}).Create(data).Error; err != nil {
		return errors.Wrapf(err, "data: %v", &data)
	}
	return
}

// IndexDeleteBatch 删除索引
// isDeleteAll 是否删除所有索引 false 只删除日志索引
func IndexDeleteBatch(db *gorm.DB, tid int, isDeleteAll bool) (err error) {
	q := db.Model(BaseIndex{})
	if isDeleteAll {
		q.Where("`tid`=?", tid)
	} else {
		q.Where("`tid`=? and `kind`=1", tid)
	}
	if err = q.Unscoped().Delete(&BaseIndex{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
