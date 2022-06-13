package db

import (
	"errors"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/ego-component/egorm"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type HiddenField struct {
	BaseModel
	Tid   int    `gorm:"column:tid;type:int(11);index:uix_tid_field,unique" json:"tid"`                   // table id idx
	Field string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field,unique" json:"field"` // index field name
}

func (t *HiddenField) TableName() string {
	return TableNameHiddenField
}

func HiddenFieldCreateBatch(db *gorm.DB, data []*HiddenField) (err error) {
	if data == nil || len(data) == 0 {
		return errors.New("empty param")
	}
	if err = db.Model(HiddenField{}).CreateInBatches(data, 100).Error; err != nil {
		invoker.Logger.Error("create HiddenField error", zap.Error(err))
		return
	}
	return
}

func HiddenFieldDelete(db *gorm.DB, ids []int) (err error) {
	if ids == nil || len(ids) == 0 {
		return errors.New("empty param")
	}
	if err = db.Model(HiddenField{}).Unscoped().Where("`id` in (?)", ids).Delete(&HiddenField{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func HiddenFieldList(conds egorm.Conds) (resp []*HiddenField, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(HiddenField{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("HiddenField list error", zap.Error(err))
		return
	}
	return
}
