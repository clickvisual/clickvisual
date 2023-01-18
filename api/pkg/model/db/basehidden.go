package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (b *BaseHiddenField) TableName() string {
	return TableNameBaseHiddenField
}

type BaseHiddenField struct {
	BaseModel

	Tid   int    `gorm:"column:tid;type:int(11);index:uix_tid_field,unique" json:"tid"`                   // table id idx
	Field string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field,unique" json:"field"` // index field name
}

func HiddenFieldCreateBatch(db *gorm.DB, data []*BaseHiddenField) (err error) {
	if data == nil || len(data) == 0 {
		return errors.New("empty param")
	}
	if err = db.Model(BaseHiddenField{}).CreateInBatches(data, 100).Error; err != nil {
		elog.Error("create BaseHiddenField error", zap.Error(err))
		return
	}
	return
}

func HiddenFieldDeleteByFields(db *gorm.DB, fields []string) (err error) {
	if fields == nil || len(fields) == 0 {
		return errors.New("empty param")
	}
	if err = db.Model(BaseHiddenField{}).Unscoped().Where("`field` in (?)", fields).Delete(&BaseHiddenField{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func HiddenFieldList(conds egorm.Conds) (resp []*BaseHiddenField, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BaseHiddenField{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}
