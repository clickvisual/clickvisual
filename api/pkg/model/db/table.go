package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type BaseTable struct {
	BaseModel

	Did            int    `gorm:"column:did;type:bigint(20);index:uix_did_name,unique" json:"did"`             // database id
	Name           string `gorm:"column:name;type:varchar(64);NOT NULL;index:uix_did_name,unique" json:"name"` // table
	Typ            int    `gorm:"column:typ;type:int(11)" json:"typ"`                                          // table type, 1 string 2 float
	Days           int    `gorm:"column:days;type:int(11)" json:"days"`                                        // data expire days
	Brokers        string `gorm:"column:brokers;type:varchar(255);NOT NULL" json:"brokers"`                    // kafka broker
	Topic          string `gorm:"column:topic;type:varchar(128);NOT NULL" json:"topic"`                        // kafka topic
	SqlData        string `gorm:"column:sql_data;type:text" json:"sqlData"`                                    // sql_data
	SqlStream      string `gorm:"column:sql_stream;type:text" json:"sqlStream"`                                // sql_stream
	SqlView        string `gorm:"column:sql_view;type:text" json:"sqlView"`                                    // sql_view
	SqlDistributed string `gorm:"column:sql_distributed;type:text" json:"sqlDistributed"`                      // sql_distributed
	Uid            int    `gorm:"column:uid;type:int(11)" json:"uid"`                                          // 操作人
	CreateType     int    `gorm:"column:create_type;type:tinyint(1)" json:"createType"`                        // operation type, 0 means create clickvisual fresh table, 1 means use exists table
	TimeField      string `gorm:"column:time_field;type:varchar(128);NOT NULL" json:"timeField"`               // custom time filed name of _time_
	TimeFieldType  int    `gorm:"column:time_field_type;type:int(11);default:0;NOT NULL" json:"timeFieldType"` // custom time filed type name of _time_
	Desc           string `gorm:"column:desc;type:varchar(255)" json:"desc"`

	Database *BaseDatabase `json:"database,omitempty" gorm:"foreignKey:Did;references:ID"`
}

func (m *BaseTable) TableName() string {
	return TableNameBaseTable
}

const TimeFieldSecond = "_time_second_"
const TimeFieldNanoseconds = "_time_nanosecond_"
const (
	TimeFieldTypeDT   = 0 // DateTime
	TimeFieldTypeTs   = 1 // unix seconds
	TimeFieldTypeTsMs = 2 // unix ms
	TimeFieldTypeDT3  = 3 // DataTime64(3)
)

func (m *BaseTable) GetTimeField() string {
	if m.TimeField == "" {
		return TimeFieldSecond
	}
	return m.TimeField
}

// TableCreate ...
func TableCreate(db *gorm.DB, data *BaseTable) (err error) {
	if err = db.Model(BaseTable{}).Create(data).Error; err != nil {
		invoker.Logger.Error("release error", zap.Error(err))
		return
	}
	return
}

// TableDelete Soft delete
func TableDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseTable{}).Unscoped().Delete(&BaseTable{}, id).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// TableInfoX Info extension method to query a single record according to Cond
func TableInfoX(db *gorm.DB, conds map[string]interface{}) (resp BaseTable, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseTable).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func TableInfo(db *gorm.DB, paramId int) (resp BaseTable, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseTable).Preload("BaseDatabase").Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

// TableUpdate ...
func TableUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseTable).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

// TableList Get all currently undeleted clusters. Mainly used for front end
func TableList(db *gorm.DB, conds egorm.Conds) (resp []*BaseTable, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameBaseTable).Preload("BaseDatabase").Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
