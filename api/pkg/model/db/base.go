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

func (b *BaseIndex) TableName() string {
	return TableNameBaseIndex
}

func (b *BaseHiddenField) TableName() string {
	return TableNameBaseHiddenField
}

type BaseHiddenField struct {
	BaseModel

	Tid   int    `gorm:"column:tid;type:int(11);index:uix_tid_field,unique" json:"tid"`                   // table id idx
	Field string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field,unique" json:"field"` // index field name
}

// BaseIndex 索引数据存储
type BaseIndex struct {
	BaseModel

	Tid      int    `gorm:"column:tid;type:int(11);index:uix_tid_field_root,unique" json:"tid"`                         // table id
	Field    string `gorm:"column:field;type:varchar(64);NOT NULL;index:uix_tid_field_root,unique" json:"field"`        // index field name
	RootName string `gorm:"column:root_name;type:varchar(64);NOT NULL;index:uix_tid_field_root,unique" json:"rootName"` // root_name
	Typ      int    `gorm:"column:typ;type:int(11);NOT NULL" json:"typ"`                                                // 0 string 1 int 2 float
	HashTyp  int    `gorm:"column:hash_typ;type:tinyint(1)" json:"hashTyp"`                                             // hash type, 0 no hash 1 sipHash64 2 URLHash
	Alias    string `gorm:"column:alias;type:varchar(128);NOT NULL" json:"alias"`                                       // index filed alias name
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
		return errors.Wrapf(err, "data: %v", data)
	}
	return
}

func IndexDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(BaseIndex{}).Where("`tid`=?", tid).Unscoped().Delete(&BaseIndex{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
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
