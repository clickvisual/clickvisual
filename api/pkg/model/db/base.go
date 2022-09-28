package db

import (
	"errors"
	"fmt"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
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
)

const (
	RuleStoreTypeFile = 1
	RuleStoreTypeK8s  = 2
)

const TimeFieldSecond = "_time_second_"
const TimeFieldNanoseconds = "_time_nanosecond_"

const (
	TimeFieldTypeDT   = 0 // DateTime
	TimeFieldTypeTsMs = 2 // unix ms
	TimeFieldTypeDT3  = 3 // DataTime64(3)
)

const (
	SuffixJaegerJSON = "_jaeger_dependencies"
)

func (b *BaseView) TableName() string {
	return TableNameBaseView
}

func (b *BaseTable) TableName() string {
	return TableNameBaseTable
}

func (b *BaseInstance) TableName() string {
	return TableNameBaseInstance
}

func (b *BaseIndex) TableName() string {
	return TableNameBaseIndex
}

func (b *BaseHiddenField) TableName() string {
	return TableNameBaseHiddenField
}

func (b *BaseDatabase) TableName() string {
	return TableNameBaseDatabase
}

func (b *BaseShortURL) TableName() string {
	return TableBaseShortURL
}

// BaseDatabase 数据库管理
type BaseDatabase struct {
	BaseModel

	Iid          int    `gorm:"column:iid;type:int(11);index:uix_iid_name,unique" json:"iid"`                 // datasource instance id
	Name         string `gorm:"column:name;type:varchar(128);index:uix_iid_name,unique;NOT NULL" json:"name"` // datasource database name
	Uid          int    `gorm:"column:uid;type:int(11)" json:"uid"`                                           // datasource operator uid
	Cluster      string `gorm:"column:cluster;type:varchar(128);NOT NULL" json:"cluster"`                     // cluster
	IsCreateByCV int    `gorm:"column:is_create_by_cv;type:tinyint(1)" json:"isCreateByCV"`
	Desc         string `gorm:"column:desc;type:varchar(255)" json:"desc"`

	Instance *BaseInstance `json:"instance,omitempty" gorm:"foreignKey:Iid;references:ID"`
}

type BaseHiddenField struct {
	BaseModel

	Tid   int    `gorm:"column:tid;type:int(11);index:uix_tid_field,unique" json:"tid"`                   // table id idx
	Field string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field,unique" json:"field"` // index field name
}

// BaseIndex 索引数据存储
type BaseIndex struct {
	BaseModel

	Tid      int    `gorm:"column:tid;type:int(11);index:uix_tid_field_root,unique" json:"tid"`                          // table id
	Field    string `gorm:"column:field;type:varchar(128);NOT NULL;index:uix_tid_field_root,unique" json:"field"`        // index field name
	RootName string `gorm:"column:root_name;type:varchar(128);NOT NULL;index:uix_tid_field_root,unique" json:"rootName"` // root_name
	Typ      int    `gorm:"column:typ;type:int(11);NOT NULL" json:"typ"`                                                 // 0 string 1 int 2 float
	HashTyp  int    `gorm:"column:hash_typ;type:tinyint(1)" json:"hashTyp"`                                              // hash type, 0 no hash 1 sipHash64 2 URLHash
	Alias    string `gorm:"column:alias;type:varchar(128);NOT NULL" json:"alias"`                                        // index filed alias name
}

// BaseInstance 服务配置存储
type BaseInstance struct {
	BaseModel

	Datasource       string  `gorm:"column:datasource;type:varchar(32);NOT NULL;index:idx_datasource_name,unique" json:"datasource"` // datasource type
	Name             string  `gorm:"column:name;type:varchar(128);NOT NULL;index:idx_datasource_name,unique" json:"name"`            // datasource instance name
	Dsn              string  `gorm:"column:dsn;type:text" json:"dsn"`                                                                // dsn
	RuleStoreType    int     `gorm:"column:rule_store_type;type:int(11)" json:"ruleStoreType"`                                       // rule_store_type 1 集群 2 文件
	FilePath         string  `gorm:"column:file_path;type:varchar(255)" json:"filePath"`                                             // file_path
	Desc             string  `gorm:"column:desc;type:varchar(255)" json:"desc"`                                                      // file_path
	ClusterId        int     `gorm:"column:cluster_id;type:int(11)" json:"clusterId"`                                                // cluster_id
	Namespace        string  `gorm:"column:namespace;type:varchar(128)" json:"namespace"`                                            // namespace
	Configmap        string  `gorm:"column:configmap;type:varchar(128)" json:"configmap"`                                            // configmap
	PrometheusTarget string  `gorm:"column:prometheus_target;type:varchar(128)" json:"prometheusTarget"`                             // prometheus ip or domain, eg: https://prometheus:9090
	Mode             int     `gorm:"column:mode;type:tinyint(1)" json:"mode"`                                                        // 0 standalone 1 cluster
	ReplicaStatus    int     `gorm:"column:replica_status;type:tinyint(1)" json:"replicaStatus"`                                     // status 0 has replica 1 no replica
	Clusters         Strings `gorm:"column:clusters;type:text" json:"clusters"`
}

type BaseTable struct {
	BaseModel

	Did                     int    `gorm:"column:did;type:int(11);index:uix_did_name,unique" json:"did"`                // database id
	Name                    string `gorm:"column:name;type:varchar(64);NOT NULL;index:uix_did_name,unique" json:"name"` // table
	Typ                     int    `gorm:"column:typ;type:int(11)" json:"typ"`                                          // table type, 1 string 2 float
	Days                    int    `gorm:"column:days;type:int(11)" json:"days"`                                        // data expire days
	Brokers                 string `gorm:"column:brokers;type:varchar(255);NOT NULL" json:"brokers"`                    // kafka broker
	Topic                   string `gorm:"column:topic;type:varchar(128);NOT NULL" json:"topic"`                        // kafka topic
	ConsumerNum             int    `gorm:"column:consumer_num;type:int(11)" json:"consumerNum"`                         // kafka consumer number
	SqlData                 string `gorm:"column:sql_data;type:text" json:"sqlData"`                                    // sql_data
	SqlStream               string `gorm:"column:sql_stream;type:text" json:"sqlStream"`                                // sql_stream
	SqlView                 string `gorm:"column:sql_view;type:text" json:"sqlView"`                                    // sql_view
	SqlDistributed          string `gorm:"column:sql_distributed;type:text" json:"sqlDistributed"`                      // sql_distributed
	Uid                     int    `gorm:"column:uid;type:int(11)" json:"uid"`                                          // operator uid
	CreateType              int    `gorm:"column:create_type;type:tinyint(1)" json:"createType"`                        // operation type, 0 means create clickvisual fresh table, 1 means use exists table
	TimeField               string `gorm:"column:time_field;type:varchar(128);NOT NULL" json:"timeField"`               // custom time filed name of _time_
	TimeFieldType           int    `gorm:"column:time_field_type;type:int(11);default:0;NOT NULL" json:"timeFieldType"` // custom time filed type name of _time_
	Desc                    string `gorm:"column:desc;type:varchar(255)" json:"desc"`
	RawLogField             string `gorm:"column:raw_log_field;type:varchar(255)" json:"rawLogField"`
	SelectFields            string `gorm:"column:select_fields;type:text" json:"selectFields"` // sql_distributed
	AnyJSON                 string `gorm:"column:any_json;type:text" json:"anyJSON"`
	KafkaSkipBrokenMessages int    `gorm:"column:kafka_skip_broken_messages;type:int(11)" json:"kafkaSkipBrokenMessages"`
	IsKafkaTimestamp        int    `gorm:"column:is_kafka_timestamp;type:tinyint(1)" json:"isKafkaTimestamp"`

	TraceTableId int `gorm:"column:trace_table_id;type:int(11)" json:"traceTableId"`
	V3TableType  int `gorm:"column:v3_table_type;type:int(11)" json:"v3TableType"` // 0 default 1 jaegerJson

	Database *BaseDatabase `json:"database,omitempty" gorm:"foreignKey:Did;references:ID"`
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

type BaseShortURL struct {
	BaseModel

	OriginUrl string `gorm:"column:origin_url;type:text" json:"origin_url"`
	SCode     string `gorm:"column:s_code;type:varchar(64);NOT NULL" json:"s_code"`
	CallCnt   int    `gorm:"column:call_cnt;type:int(11)" json:"call_cnt"`
}

// DatabaseCreate ...
func DatabaseCreate(db *gorm.DB, data *BaseDatabase) (err error) {
	if err = db.Model(BaseDatabase{}).Create(data).Error; err != nil {
		invoker.Logger.Error("release error", zap.Error(err))
		return
	}
	return
}

// DatabaseDelete Soft delete
func DatabaseDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseDatabase{}).Unscoped().Delete(&BaseDatabase{}, id).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// DatabaseInfoX Info extension method to query a single record according to Cond
func DatabaseInfoX(db *gorm.DB, conds map[string]interface{}) (resp BaseDatabase, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func DatabaseInfo(db *gorm.DB, paramId int) (resp BaseDatabase, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseDatabase).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

func DatabaseGetOrCreate(db *gorm.DB, uid, iid int, name string) (resp BaseDatabase, err error) {
	conds := egorm.Conds{}
	conds["iid"] = iid
	conds["name"] = name
	d, err := DatabaseInfoX(db, conds)
	if err != nil && err != gorm.ErrRecordNotFound {
		return
	}
	if d.ID != 0 {
		return d, nil
	}
	// create
	resp = BaseDatabase{
		Iid:  iid,
		Name: name,
		Uid:  uid,
	}
	if err = DatabaseCreate(db, &resp); err != nil {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

// DatabaseUpdate ...
func DatabaseUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseDatabase).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

// DatabaseList Get all currently undeleted clusters. Mainly used for front end
func DatabaseList(db *gorm.DB, conds egorm.Conds) (resp []*BaseDatabase, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseDatabase).Preload("Instance").Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}

func HiddenFieldCreateBatch(db *gorm.DB, data []*BaseHiddenField) (err error) {
	if data == nil || len(data) == 0 {
		return errors.New("empty param")
	}
	if err = db.Model(BaseHiddenField{}).CreateInBatches(data, 100).Error; err != nil {
		invoker.Logger.Error("create BaseHiddenField error", zap.Error(err))
		return
	}
	return
}

func HiddenFieldDeleteByFields(db *gorm.DB, fields []string) (err error) {
	if fields == nil || len(fields) == 0 {
		return errors.New("empty param")
	}
	if err = db.Model(BaseHiddenField{}).Unscoped().Where("`field` in (?)", fields).Delete(&BaseHiddenField{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func HiddenFieldList(conds egorm.Conds) (resp []*BaseHiddenField, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BaseHiddenField{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("BaseHiddenField list error", zap.Error(err))
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

func IndexDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(BaseIndex{}).Where("`tid`=?", tid).Unscoped().Delete(&BaseIndex{}).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func (t *BaseInstance) DsKey() string {
	return InstanceKey(t.ID)
}

func InstanceKey(id int) string {
	return fmt.Sprintf("%d", id)
}

// InstanceList ..
func InstanceList(conds egorm.Conds, extra ...string) (resp []*BaseInstance, err error) {
	sql, binds := egorm.BuildQuery(conds)
	sorts := ""
	if len(extra) >= 1 {
		sorts = extra[0]
	}
	if sorts == "" {
		sorts = "id desc"
	}
	if err = invoker.Db.Model(BaseInstance{}).Where(sql, binds...).Order(sorts).Find(&resp).Error; err != nil {
		invoker.Logger.Error("ConfigMap list error", zap.Error(err))
		return
	}
	return
}

func InstanceCreate(db *gorm.DB, data *BaseInstance) (err error) {
	if err = db.Model(BaseInstance{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create release error", zap.Error(err))
		return
	}
	return
}

func InstanceInfo(db *gorm.DB, id int) (resp BaseInstance, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(BaseInstance{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func InstanceDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseInstance{}).Unscoped().Delete(&BaseInstance{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func InstanceUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BaseInstance{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

// InstanceInfoX Info extension method to query a single record according to Cond
func InstanceInfoX(db *gorm.DB, conds map[string]interface{}) (resp BaseInstance, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameBaseInstance).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

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
	if err = db.Table(TableNameBaseTable).Preload("Database").Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
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
	if err = db.Table(TableNameBaseTable).Preload("Database").Where(sql, binds...).Order("id asc").Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}

// ViewUpdate ...
func ViewUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseView).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

func ViewInfo(db *gorm.DB, paramId int) (resp BaseView, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameBaseView).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

// ViewInfoX Info extension method to query a single record according to Cond
func ViewInfoX(conds map[string]interface{}) (resp BaseView, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameBaseView).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func ViewCreate(db *gorm.DB, data *BaseView) (err error) {
	if err = db.Model(BaseView{}).Create(data).Error; err != nil {
		invoker.Logger.Error("release error", zap.Error(err))
		return
	}
	return
}

// ViewDelete Soft delete
func ViewDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BaseView{}).Unscoped().Delete(&BaseView{}, id).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// ViewDeleteByTableID  Soft delete
func ViewDeleteByTableID(db *gorm.DB, tid int) (err error) {
	if err = db.Model(BaseView{}).Where("tid = ?", tid).Unscoped().Delete(&BaseView{}).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// ViewList Get all currently undeleted clusters. Mainly used for front end
func ViewList(db *gorm.DB, conds egorm.Conds) (resp []*BaseView, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameBaseView).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}

func ShortURLInfoBySCode(db *gorm.DB, sCode string) (resp BaseShortURL, err error) {
	var sql = "`s_code`=?"
	var binds = []interface{}{sCode}
	if err = db.Model(BaseShortURL{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("get info error", zap.Error(err))
		return
	}
	return
}

func ShortURLCreate(db *gorm.DB, data *BaseShortURL) (err error) {
	if err = db.Model(BaseShortURL{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create error", zap.Error(err))
		return
	}
	return
}

func ShortURLUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BaseShortURL{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

func ShortURLDelete30Days() {
	expire := time.Hour * 24 * 30
	if err := invoker.Db.Model(BaseShortURL{}).Where("utime<?", time.Now().Add(-expire).Unix()).Unscoped().Delete(&BaseShortURL{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
}
