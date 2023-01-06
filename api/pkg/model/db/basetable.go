package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const (
	TimeFieldTypeDT     = 0 // DateTime
	TimeFieldTypeSecond = 1
	TimeFieldTypeTsMs   = 2 // unix ms
	TimeFieldTypeDT3    = 3 // DataTime64(3)
)

type BaseTable struct {
	BaseModel

	Did                     int    `gorm:"column:did;type:int(11);index:uix_did_name,unique" json:"did"`                 // database id
	Name                    string `gorm:"column:name;type:varchar(128);NOT NULL;index:uix_did_name,unique" json:"name"` // table
	Typ                     int    `gorm:"column:typ;type:int(11)" json:"typ"`                                           // table type, 1 string 2 float
	Days                    int    `gorm:"column:days;type:int(11)" json:"days"`                                         // data expire days
	Brokers                 string `gorm:"column:brokers;type:varchar(255);NOT NULL" json:"brokers"`                     // kafka broker
	Topic                   string `gorm:"column:topic;type:varchar(128);NOT NULL" json:"topic"`                         // kafka topic
	ConsumerNum             int    `gorm:"column:consumer_num;type:int(11)" json:"consumerNum"`                          // kafka consumer number
	Uid                     int    `gorm:"column:uid;type:int(11)" json:"uid"`                                           // operator uid
	CreateType              int    `gorm:"column:create_type;type:tinyint(1)" json:"createType"`                         // operation type, 0 means create clickvisual fresh table, 1 means use exists table
	TimeField               string `gorm:"column:time_field;type:varchar(128);NOT NULL" json:"timeField"`                // custom time filed name of _time_
	TimeFieldType           int    `gorm:"column:time_field_type;type:int(11);default:0;NOT NULL" json:"timeFieldType"`  // custom time filed type name of _time_
	Desc                    string `gorm:"column:desc;type:varchar(255)" json:"desc"`
	RawLogField             string `gorm:"column:raw_log_field;type:varchar(255)" json:"rawLogField"`
	KafkaSkipBrokenMessages int    `gorm:"column:kafka_skip_broken_messages;type:int(11)" json:"kafkaSkipBrokenMessages"`
	IsKafkaTimestamp        int    `gorm:"column:is_kafka_timestamp;type:tinyint(1)" json:"isKafkaTimestamp"`

	// text
	SelectFields   string `gorm:"column:select_fields;type:text" json:"selectFields"` // sql_distributed
	AnyJSON        string `gorm:"column:any_json;type:text" json:"anyJSON"`
	SqlData        string `gorm:"column:sql_data;type:text" json:"sqlData"`               // sql_data
	SqlStream      string `gorm:"column:sql_stream;type:text" json:"sqlStream"`           // sql_stream
	SqlView        string `gorm:"column:sql_view;type:text" json:"sqlView"`               // sql_view
	SqlDistributed string `gorm:"column:sql_distributed;type:text" json:"sqlDistributed"` // sql_distributed

	TraceTableId int `gorm:"column:trace_table_id;type:int(11)" json:"traceTableId"`
	V3TableType  int `gorm:"column:v3_table_type;type:int(11)" json:"v3TableType"` // 0 default 1 jaegerJson

	Database *BaseDatabase `json:"database,omitempty" gorm:"foreignKey:Did;references:ID"`
}

type ReqCreateBufferNullDataPipe struct {
	Cluster  string
	Database string
	Table    string
	TTL      int
}

func (b *BaseTable) TableName() string {
	return TableNameBaseTable
}

func (b *BaseTable) GetTimeField() string {
	if b.TimeField == "" {
		return TimeFieldSecond
	}
	return b.TimeField
}

// TableCreate ...
func TableCreate(db *gorm.DB, data *BaseTable) (err error) {
	if err = db.Model(BaseTable{}).Create(data).Error; err != nil {
		return errors.Wrapf(err, "data is %v", data)
	}
	return
}

// TableDelete Soft delete
func TableDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseTable{}).Unscoped().Delete(&BaseTable{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

// TableInfoX Info extension method to query a single record according to Cond
func TableInfoX(db *gorm.DB, conds map[string]interface{}) (resp BaseTable, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseTable).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func TableInfo(db *gorm.DB, paramId int) (resp BaseTable, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseTable).Preload("Database").Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		err = errors.Wrapf(err, "table id: %d", paramId)
		return
	}
	return
}

// TableUpdate ...
func TableUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseTable).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

// TableList Get all currently undeleted clusters. Mainly used for front end
func TableList(db *gorm.DB, conds egorm.Conds) (resp []*BaseTable, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameBaseTable).Preload("Database").Where(sql, binds...).Order("id asc").Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		return nil, errors.Wrapf(err, "conds %v:", conds)
	}
	return
}

func TableListByInstanceId(db *gorm.DB, iid int) (resp []*BaseTable, err error) {
	conds := egorm.Conds{}
	conds["iid"] = iid
	databases, _ := DatabaseList(db, conds)
	for _, database := range databases {
		condsTb := egorm.Conds{}
		condsTb["did"] = database.ID
		tables, errTableList := TableList(db, condsTb)
		if errTableList != nil {
			continue
		}
		resp = append(resp, tables...)
	}
	return
}
