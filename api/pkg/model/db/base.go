package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	HashTypeSip int = 1
	HashTypeURL int = 2
)

const (
	_ = iota
	V3TableTypeJaegerJSON
)

const (
	DatasourceMySQL      = "mysql"
	DatasourceClickHouse = "ch"
	DatasourceDatabend   = "databend"
)

const TimeFieldSecond = "_time_second_"
const TimeFieldNanoseconds = "_time_nanosecond_"

const (
	SuffixJaegerJSON = "_jaeger_dependencies"
)

func (b *BaseView) TableName() string {
	return TableNameBaseView
}

func (b *BaseHiddenField) TableName() string {
	return TableNameBaseHiddenField
}

type BaseHiddenField struct {
	BaseModel

	Tid   int    `gorm:"column:tid;type:int(11);index:uix_tid_field,unique" json:"tid"`                   // table id idx
	Field string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field,unique" json:"field"` // index field name
}

// BaseView Materialized view management
type BaseView struct {
	BaseModel

	Tid              int    `gorm:"column:tid;type:int(11);index:uix_tid_name,unique" json:"tid"`                // table id
	Name             string `gorm:"column:name;type:varchar(64);NOT NULL;index:uix_tid_name,unique" json:"name"` // view name
	IsUseDefaultTime int    `gorm:"column:is_use_default_time;type:int(11)" json:"isUseDefaultTime"`             // use system time or not
	Key              string `gorm:"column:key;type:varchar(64);NOT NULL" json:"key"`                             // field name of time in raw log
	Format           string `gorm:"column:format;type:varchar(64);NOT NULL" json:"format"`                       // timestamp parse to extract time from raw log and parse it to datetime
	SqlView          string `gorm:"column:sql_view;type:text" json:"sqlView"`                                    // sql_view
	Uid              int    `gorm:"column:uid;type:int(11)" json:"uid"`                                          // operator uid
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

// ViewUpdate ...
func ViewUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseView).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func ViewInfo(db *gorm.DB, paramId int) (resp BaseView, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseView).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		err = errors.Wrapf(err, "table view id: %d", paramId)
		return
	}
	return
}

// ViewInfoX Info extension method to query a single record according to Cond
func ViewInfoX(conds map[string]interface{}) (resp BaseView, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameBaseView).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func ViewCreate(db *gorm.DB, data *BaseView) (err error) {
	if err = db.Model(BaseView{}).Create(data).Error; err != nil {
		elog.Error("release error", zap.Error(err))
		return
	}
	return
}

// ViewDelete Soft delete
func ViewDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseView{}).Unscoped().Delete(&BaseView{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

// ViewDeleteByTableID  Soft delete
func ViewDeleteByTableID(db *gorm.DB, tid int) (err error) {
	if err = db.Model(BaseView{}).Where("tid = ?", tid).Unscoped().Delete(&BaseView{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

// ViewList Get all currently undeleted clusters. Mainly used for front end
func ViewList(db *gorm.DB, conds egorm.Conds) (resp []*BaseView, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameBaseView).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}
