package inquiry

import (
	"database/sql"
	"fmt"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/cluster"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/standalone"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	defaultStringTimeParse = `parseDateTimeBestEffort(%s) AS _time_second_,
  toDateTime64(parseDateTimeBestEffort(%s), 9, 'Asia/Shanghai') AS _time_nanosecond_`
	defaultFloatTimeParse = `toDateTime(toInt64(%s)) AS _time_second_,
  fromUnixTimestamp64Nano(toInt64(%s*1000000000),'Asia/Shanghai') AS _time_nanosecond_`
	defaultCondition = "1='1'"
)

const (
	defaultStringTimeParseV3 = `parseDateTimeBestEffort(JSONExtractString(%s, '%s')) AS _time_second_,
  toDateTime64(parseDateTimeBestEffort(JSONExtractString(%s, '%s')), 9, 'Asia/Shanghai') AS _time_nanosecond_`
	defaultFloatTimeParseV3 = `toDateTime(toInt64(JSONExtractFloat(%s, '%s'))) AS _time_second_,
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(%s, '%s')*1000000000),'Asia/Shanghai') AS _time_nanosecond_`
)

// time_field 高精度数据解析选择
var nanosecondTimeParse = `toDateTime(toInt64(JSONExtractFloat(%s, '%s'))) AS _time_second_, 
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(%s, '%s')*1000000000),'Asia/Shanghai') AS _time_nanosecond_`

var typORM = map[int]string{
	-2: "DateTime64(3)",
	-1: "DateTime",
	0:  "String",
	1:  "Int64",
	2:  "Float64",
	3:  "JSON",
	4:  "UInt64",
}

var jsonExtractORM = map[int]string{
	0: "toString",
	1: "toInt64OrNull",
	2: "toFloat64OrNull",
}

const (
	ModeCluster int = 1
)

func genTimeCondition(param view.ReqQuery) string {
	switch param.TimeFieldType {
	case db.TimeFieldTypeDT:
		return fmt.Sprintf("%s >= toDateTime(%s) AND %s < toDateTime(%s)", param.TimeField, "%d", param.TimeField, "%d")
	case db.TimeFieldTypeDT3:
		return fmt.Sprintf("%s >= toDateTime64(%s, 3) AND %s < toDateTime64(%s, 3)", param.TimeField, "%d", param.TimeField, "%d")
	case db.TimeFieldTypeTsMs:
		return fmt.Sprintf("intDiv(%s,1000) >= %s AND intDiv(%s,1000) < %s", param.TimeField, "%d", param.TimeField, "%d")
	}
	return param.TimeField + " >= %d AND " + param.TimeField + " < %d"
}

func genTimeConditionEqual(param view.ReqQuery, t time.Time) string {
	switch param.TimeFieldType {
	case db.TimeFieldTypeDT:
		return fmt.Sprintf("toUnixTimestamp(%s) = %d", param.TimeField, t.Unix())
	case db.TimeFieldTypeDT3:
		return fmt.Sprintf("%s = toDateTime64(%f, 3)", param.TimeField, float64(t.UnixMilli())/1000.0)
	case db.TimeFieldTypeTsMs:
		return fmt.Sprintf("%s = %d", param.TimeField, t.UnixMilli())
	}
	return fmt.Sprintf("%s = %d", param.TimeField, t.Unix())
}

type ClickHouse struct {
	id   int
	mode int
	rs   int // replica status
	db   *sql.DB
}

func NewClickHouse(db *sql.DB, ins *db.BaseInstance) *ClickHouse {
	if ins.ID == 0 {
		panic("clickhouse add err, id is 0")
	}
	return &ClickHouse{
		db:   db,
		id:   ins.ID,
		mode: ins.Mode,
		rs:   ins.ReplicaStatus,
	}
}

func (c *ClickHouse) ID() int {
	return c.id
}

func (c *ClickHouse) Conn() *sql.DB {
	return c.db
}

func (c *ClickHouse) genJsonExtractSQL(indexes map[string]*db.BaseIndex, rawLogField string) string {
	jsonExtractSQL := ",\n"
	for _, obj := range indexes {
		if obj.RootName == "" {
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(%s, '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.Field, obj.GetFieldName())
		} else {
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(JSONExtractRaw(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(JSONExtractRaw(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(JSONExtractRaw(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(JSONExtractRaw(%s, '%s'), '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",\n")
	return jsonExtractSQL
}

func (c *ClickHouse) whereConditionSQLCurrent(current *db.BaseView, rawLogField string) string {
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(%s, '%s') = 1", rawLogField, current.Key)
}

func (c *ClickHouse) whereConditionSQLDefault(list []*db.BaseView, rawLogField string) string {
	if list == nil {
		return "1=1"
	}
	var defaultSQL string
	// It is required to obtain all the view parameters under the current table and construct the default and current view query conditions
	for k, viewRow := range list {
		if k == 0 {
			defaultSQL = fmt.Sprintf("JSONHas(%s, '%s') = 0", rawLogField, viewRow.Key)
		} else {
			defaultSQL = fmt.Sprintf("%s AND JSONHas(%s, '%s') = 0", defaultSQL, rawLogField, viewRow.Key)
		}
	}
	if defaultSQL == "" {
		return "1=1"
	}
	return defaultSQL
}

func (c *ClickHouse) timeParseSQL(typ int, v *db.BaseView, timeField, rawLogField string) string {
	if timeField == "" {
		timeField = "_time_"
	}
	if v != nil && v.Format == "fromUnixTimestamp64Micro" && v.IsUseDefaultTime == 0 {
		return fmt.Sprintf(nanosecondTimeParse, rawLogField, v.Key, rawLogField, v.Key)
	}
	if typ == TableTypeString {
		return fmt.Sprintf(defaultStringTimeParse, timeField, timeField)
	}
	return fmt.Sprintf(defaultFloatTimeParse, timeField, timeField)
}

// ViewSync
// delete: list need remove current
// update: list need update current
// create: list need add current
func (c *ClickHouse) ViewSync(table db.BaseTable, current *db.BaseView, list []*db.BaseView, isAddOrUpdate bool) (dViewSQL, cViewSQL string, err error) {
	// build view statement
	conds := egorm.Conds{}
	conds["tid"] = table.ID
	indexes, err := db.IndexList(conds)
	if err != nil {
		return
	}
	indexMap := make(map[string]*db.BaseIndex)
	for _, i := range indexes {
		indexMap[i.Field] = i
	}
	invoker.Logger.Debug("ViewCreate", elog.String("dViewSQL", dViewSQL), elog.String("cViewSQL", cViewSQL))
	dViewSQL, err = c.viewOperator(table.Typ, table.ID, table.Did, table.Name, "", current, list, indexMap, isAddOrUpdate)
	if err != nil {
		return
	}
	cViewSQL, err = c.viewOperator(table.Typ, table.ID, table.Did, table.Name, current.Key, current, list, indexMap, isAddOrUpdate)
	return
}

func (c *ClickHouse) Prepare(res view.ReqQuery, isFilter bool) (view.ReqQuery, error) {
	if res.Database != "" {
		res.DatabaseTable = fmt.Sprintf("`%s`.`%s`", res.Database, res.Table)
	}
	if res.Page <= 0 {
		res.Page = 1
	}
	if res.PageSize <= 0 {
		res.PageSize = 20
	}
	if res.Query == "" {
		res.Query = defaultCondition
	}
	if res.ET == res.ST && res.ST != 0 {
		res.ET = res.ST + 1
	}
	interval := res.ET - res.ST
	if econf.GetInt64("app.queryLimitHours") != 0 && interval > econf.GetInt64("app.queryLimitHours")*3600 {
		return res, constx.ErrQueryIntervalLimit
	}
	if interval <= 0 {
		res.ST = time.Now().Add(-time.Minute * 15).Unix()
		res.ET = time.Now().Unix()
	}
	var err error
	if isFilter {
		res.Query, err = queryTransformer(res.Query)
	}
	return res, err
}

// TableDrop data view stream
func (c *ClickHouse) TableDrop(database, table, cluster string, tid int) (err error) {
	var (
		views []*db.BaseView
	)

	if c.mode == ModeCluster {
		if cluster == "" {
			err = constx.ErrClusterNameEmpty
			return
		}
		_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s.%s ON CLUSTER '%s';", database, table, cluster))
		if err != nil {
			return err
		}
		table = table + "_local"
	}

	conds := egorm.Conds{}
	conds["tid"] = tid
	views, err = db.ViewList(invoker.Db, conds)
	delViewSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", genViewName(database, table, ""))
	delStreamSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", genStreamName(database, table))
	delDataSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s.%s;", database, table)
	if c.mode == ModeCluster {
		delViewSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", genViewName(database, table, ""), cluster)
		delStreamSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", genStreamName(database, table), cluster)
		delDataSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s.%s ON CLUSTER '%s';", database, table, cluster)
	}
	_, err = c.db.Exec(delViewSQL)
	if err != nil {
		return err
	}
	// query all view
	for _, v := range views {
		userViewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", genViewName(database, table, v.Key))
		if c.mode == ModeCluster {
			userViewDropSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", genViewName(database, table, v.Key), cluster)
		}
		_, err = c.db.Exec(userViewDropSQL)
		if err != nil {
			return err
		}
	}
	_, err = c.db.Exec(delStreamSQL)
	if err != nil {
		return err
	}
	_, err = c.db.Exec(delDataSQL)
	if err != nil {
		return err
	}
	return nil
}

// TableCreate create default stream data table and view
func (c *ClickHouse) TableCreate(did int, database db.BaseDatabase, ct view.ReqTableCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	dName := genNameWithMode(c.mode, database.Name, ct.TableName)
	dStreamName := genStreamNameWithMode(c.mode, database.Name, ct.TableName)
	dataParams := bumo.Params{
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	}
	streamParams := bumo.Params{
		Stream: bumo.ParamsStream{
			TableName:               dStreamName,
			TableTyp:                TableTypStr(ct.Typ),
			Brokers:                 ct.Brokers,
			Topic:                   ct.Topics,
			Group:                   database.Name + "_" + ct.TableName,
			ConsumerNum:             ct.Consumers,
			KafkaSkipBrokenMessages: ct.KafkaSkipBrokenMessages,
		},
	}

	if c.mode == ModeCluster {
		dataParams.Cluster = database.Cluster
		dataParams.ReplicaStatus = c.rs
		streamParams.Cluster = database.Cluster
		streamParams.ReplicaStatus = c.rs
		dDataSQL = builder.Do(new(cluster.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
	} else {
		dDataSQL = builder.Do(new(standalone.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
	}
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.viewOperator(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
		return
	}
	if c.mode == ModeCluster {
		dDistributedSQL = builder.Do(new(cluster.DataBuilder), bumo.Params{
			Cluster:       database.Cluster,
			ReplicaStatus: c.rs,
			Data: bumo.ParamsData{
				DataType:    bumo.DataTypeDistributed,
				TableName:   genName(database.Name, ct.TableName),
				SourceTable: dName,
			},
		})
		invoker.Logger.Debug("TableCreate", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			invoker.Logger.Error("TableCreate", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	return
}

func (c *ClickHouse) storageViewOperator(typ, tid int, did int, table, customTimeField string, current *db.BaseView,
	list []*db.BaseView, indexes map[string]*db.BaseIndex, isCreate bool, ct view.ReqStorageCreate) (res string, err error) {
	databaseInfo, err := db.DatabaseInfo(invoker.Db, did)
	if err != nil {
		return
	}
	if c.mode == ModeCluster {
		table += "_local"
	}
	viewName := genViewName(databaseInfo.Name, table, customTimeField)

	defer func() {
		if err != nil {
			invoker.Logger.Info("viewOperator", elog.Any("tid", tid), elog.Any("customTimeField", customTimeField), elog.Any("database", databaseInfo.Name), elog.Any("table", table), elog.String("step", "doViewRollback"))
			c.viewRollback(tid, customTimeField)
		}
	}()

	var (
		viewSQL string
	)
	jsonExtractSQL := ""
	if tid != 0 {
		jsonExtractSQL = c.genJsonExtractSQL(indexes, ct.GetRawLogField())
	}
	dName := genName(databaseInfo.Name, table)
	streamName := genStreamName(databaseInfo.Name, table)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	if c.mode == ModeCluster {
		if databaseInfo.Cluster == "" {
			err = constx.ErrClusterNameEmpty
			return
		}
		viewDropSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER `%s` ;", viewName, databaseInfo.Cluster)
	}
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
		elog.Error("viewOperator", elog.String("viewDropSQL", viewDropSQL), elog.String("jsonExtractSQL", jsonExtractSQL), elog.String("viewName", viewName), elog.String("cluster", databaseInfo.Cluster))
		return "", err
	}
	// create
	var timeConv string
	var whereCond string
	if customTimeField == "" {
		timeConv = c.timeParseSQL(typ, nil, ct.TimeField, ct.GetRawLogField())
		whereCond = c.whereConditionSQLDefault(list, ct.GetRawLogField())
	} else {
		if current == nil {
			return "", errors.New("the process processes abnormal data errors, current view cannot be nil")
		}
		timeConv = c.timeParseSQL(typ, current, ct.TimeField, ct.GetRawLogField())
		whereCond = c.whereConditionSQLCurrent(current, ct.GetRawLogField())
	}
	viewSQL = c.ViewDo(bumo.Params{
		KafkaJsonMapping: ct.Mapping2String(false),
		LogField:         ct.RawLogField,
		TimeField:        ct.TimeField,
		Cluster:          databaseInfo.Cluster,
		ReplicaStatus:    c.rs,
		View: bumo.ParamsView{
			ViewTable:    viewName,
			TargetTable:  dName,
			TimeConvert:  timeConv,
			CommonFields: jsonExtractSQL,
			SourceTable:  streamName,
			Where:        whereCond,
		},
	})
	if isCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouse) viewOperator(typ, tid int, did int, table, customTimeField string, current *db.BaseView,
	list []*db.BaseView, indexes map[string]*db.BaseIndex, isCreate bool) (res string, err error) {
	tableInfo, _ := db.TableInfo(invoker.Db, tid)
	if tableInfo.CreateType == constx.TableCreateTypeUBW {
		return c.storageViewOperatorV3(view.OperatorViewParams{
			Typ:              typ,
			Tid:              tid,
			Did:              did,
			Table:            table,
			CustomTimeField:  customTimeField,
			Current:          current,
			List:             list,
			Indexes:          indexes,
			IsCreate:         isCreate,
			TimeField:        tableInfo.TimeField,
			IsKafkaTimestamp: tableInfo.IsKafkaTimestamp,
		})
	}
	rsc := view.ReqStorageCreate{}
	if tableInfo.AnyJSON != "" {
		rsc = view.ReqStorageCreateUnmarshal(tableInfo.AnyJSON)
	}
	return c.storageViewOperator(typ, tid, did, table, customTimeField, current, list, indexes, isCreate, rsc)
}

func (c *ClickHouse) DatabaseCreate(name, cluster string) error {

	query := fmt.Sprintf("create database `%s`;", name)
	if c.mode == ModeCluster {
		if cluster == "" {
			return errors.New("cluster is required")
		}
		query = fmt.Sprintf("create database `%s` on cluster `%s`;", name, cluster)
	}
	invoker.Logger.Error("TableCreate", elog.String("query", query))

	_, err := c.db.Exec(query)
	if err != nil {
		invoker.Logger.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("name", name))
		return err
	}
	return nil
}

func (c *ClickHouse) viewRollback(tid int, key string) {
	tableInfo, err := db.TableInfo(invoker.Db, tid)
	if err != nil {
		invoker.Logger.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "doViewRollback"))
		return
	}
	var viewQuery string
	if key == "" {
		// defaultView
		viewQuery = tableInfo.SqlView
	} else {
		// ts view
		condsView := egorm.Conds{}
		condsView["tid"] = tid
		condsView["key"] = key
		viewInfo, err := db.ViewInfoX(condsView)
		if err != nil {
			invoker.Logger.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "doViewRollbackViewInfoX"))
			return
		}
		viewQuery = viewInfo.SqlView
	}
	_, err = c.db.Exec(viewQuery)
	if err != nil {
		invoker.Logger.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("viewQuery", viewQuery))
		return
	}
}

func (c *ClickHouse) ViewDo(params bumo.Params) string {
	var obj builder.Builder
	switch c.mode {
	case ModeCluster:
		obj = new(cluster.ViewBuilder)
	default:
		obj = new(standalone.ViewBuilder)
	}
	return builder.Do(obj, params)
}

// AlertViewGen TableTypePrometheusMetric: `CREATE MATERIALIZED VIEW %s TO metrics.samples AS
// SELECT
//
//	    toDate(_timestamp_) as date,
//	    %s as name,
//	    array(%s) as tags,
//	    toFloat64(count(*)) as val,
//	    _timestamp_ as ts,
//	    toDateTime(_timestamp_) as updated
//	FROM %s WHERE %s GROUP by _timestamp_;`,
func (c *ClickHouse) AlertViewGen(alarm *db.Alarm, filterId int, whereCondition string) (string, string, error) {
	if whereCondition == "" {
		whereCondition = "1=1"
	}
	var (
		viewSQL         string
		viewTableName   string
		sourceTableName string
	)

	tableInfo, err := db.TableInfo(invoker.Db, alarm.Tid)
	if err != nil {
		return "", "", err
	}

	viewTableName = alarm.AlertViewName(tableInfo.Database.Name, tableInfo.Name, filterId)
	sourceTableName = fmt.Sprintf("%s.%s", tableInfo.Database.Name, tableInfo.Name)
	if c.mode == ModeCluster {
		sourceTableName += "_local"
	}

	vp := bumo.ParamsView{
		ViewType:     bumo.ViewTypePrometheusMetric,
		ViewTable:    viewTableName,
		CommonFields: TagsToString(alarm, true, filterId),
		SourceTable:  sourceTableName,
		Where:        whereCondition}

	if alarm.Mode == db.AlarmModeAggregation || alarm.Mode == db.AlarmModeAggregationCheck {
		vp.ViewType = bumo.ViewTypePrometheusMetricAggregation
		vp.WithSQL = adaSelectPart(whereCondition)
		invoker.Logger.Debug("AlertViewGen", elog.String("whereCondition", whereCondition), elog.String("ada", adaSelectPart(whereCondition)))
	}

	viewSQL = c.ViewDo(bumo.Params{
		Cluster:       tableInfo.Database.Cluster,
		ReplicaStatus: c.rs,
		TimeField:     tableInfo.GetTimeField(),
		View:          vp})
	// create
	err = c.alertPrepare()
	if err != nil {
		return "", "", err
	}
	return viewTableName, viewSQL, err
}

func (c *ClickHouse) AlertViewCreate(viewTableName, viewSQL, cluster string) (err error) {
	if viewTableName != "" {
		err = c.AlertViewDrop(viewTableName, cluster)
		if err != nil {
			invoker.Logger.Error("AlertViewCreate", elog.FieldName("alertViewDrop"), elog.FieldErr(err))
			return
		}
	}
	_, err = c.db.Exec(viewSQL)
	return err
}

func (c *ClickHouse) AlertViewDrop(viewTableName, cluster string) (err error) {
	if c.mode == ModeCluster {
		if cluster == "" {
			err = constx.ErrClusterNameEmpty
			return
		}
		_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", viewTableName, cluster))
	} else {
		_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewTableName))
	}
	return err
}

func (c *ClickHouse) alertPrepare() (err error) {
	_, err = c.db.Exec("CREATE DATABASE IF NOT EXISTS metrics;")
	if err != nil {
		return
	}
	_, err = c.db.Exec(`CREATE TABLE IF NOT EXISTS metrics.samples
(
    date Date DEFAULT toDate(0),
    name String,
    tags Array(String),
    val Float64,
    ts DateTime,
    updated DateTime DEFAULT now()
)ENGINE = GraphiteMergeTree(date, (name, tags, ts), 8192, 'graphite_rollup');`)
	return
}

func (c *ClickHouse) DropDatabase(name string, cluster string) (err error) {
	if cluster == "" {
		_, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s;", name))
	} else {
		_, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s ON CLUSTER '%s';", name, cluster))
	}
	return err
}

func TagsToString(alarm *db.Alarm, withQuote bool, filterId int) string {
	tags := alarm.Tags
	if alarm.Tags == nil || len(alarm.Tags) == 0 {
		tags = make(map[string]string, 0)
	}
	tags["uuid"] = alarm.Uuid
	result := make([]string, 0)
	for k, v := range tags {
		result = resultAppend(result, k, v, withQuote)
	}
	if filterId != 0 {
		result = resultAppend(result, "filterId", strconv.Itoa(filterId), withQuote)
	}
	return strings.Join(result, ",")
}

func resultAppend(input []string, k, v string, withQuote bool) []string {
	if withQuote {
		input = append(input, fmt.Sprintf("'%s=%s'", k, v))
	} else {
		input = append(input, fmt.Sprintf(`%s="%s"`, k, v))
	}
	return input
}

func (c *ClickHouse) Complete(sql string) (res view.RespComplete, err error) {
	res.Logs = make([]map[string]interface{}, 0)
	tmp, err := c.doQuery(sql)
	if err != nil {
		return
	}
	res.Logs = tmp
	return
}

func (c *ClickHouse) GET(param view.ReqQuery, tid int) (res view.RespQuery, err error) {
	// Initialization
	res.Logs = make([]map[string]interface{}, 0)
	res.Keys = make([]*db.BaseIndex, 0)
	res.Terms = make([][]string, 0)
	var (
		defaultSQL    string
		originalWhere string
		optimizeSQL   string
	)
	switch param.AlarmMode {
	case db.AlarmModeAggregation:
		defaultSQL = param.Query
	case db.AlarmModeAggregationCheck:
		defaultSQL = alarmAggregationSQLWith(param)
	default:
		defaultSQL, optimizeSQL, originalWhere = c.logsSQL(param, tid)
	}
	var execSQL = defaultSQL
	if optimizeSQL != "" {
		execSQL = optimizeSQL
	}
	st := time.Now()
	res.Logs, err = c.doQuery(execSQL)
	if err != nil {
		return
	}
	res.Cost = time.Since(st).Milliseconds()
	// try again
	res.Query = defaultSQL
	res.Where = strings.TrimSuffix(strings.TrimPrefix(originalWhere, "AND ("), ")")
	for k := range res.Logs {
		if param.TimeField != db.TimeFieldSecond {
			if param.TimeFieldType == db.TimeFieldTypeTsMs {
				if _, ok := res.Logs[k][db.TimeFieldSecond]; !ok {
					res.Logs[k][db.TimeFieldSecond] = res.Logs[k][param.TimeField].(int64) / 1000
					res.Logs[k][db.TimeFieldNanoseconds] = res.Logs[k][param.TimeField].(int64)
				}
			} else {
				res.Logs[k][db.TimeFieldSecond] = res.Logs[k][param.TimeField]
			}
		} else {
			// If Kafka's key is empty, it will not be displayed on the interface
			if val, ok := res.Logs[k]["_key"]; ok && val == "" {
				delete(res.Logs[k], "_key")
			}
		}
	}
	res.Limited = param.PageSize
	// Read the index data
	conds := egorm.Conds{}
	conds["tid"] = tid
	res.Keys, _ = db.IndexList(conds)
	// keys sort by the first letter
	sort.Slice(res.Keys, func(i, j int) bool {
		return res.Keys[i].Field < res.Keys[j].Field
	})
	// hash keys
	hashKeys := make([]string, 0)
	for _, k := range res.Keys {
		if hashKey, ok := k.GetHashFieldName(); ok {
			hashKeys = append(hashKeys, hashKey)
		}
	}
	if len(hashKeys) > 0 {
		for k := range res.Logs {
			for _, hashKey := range hashKeys {
				delete(res.Logs[k], hashKey)
			}
		}
	}
	res.HiddenFields = econf.GetStringSlice("app.hiddenFields")
	res.DefaultFields = econf.GetStringSlice("app.defaultFields")
	for _, k := range res.Keys {
		res.DefaultFields = append(res.DefaultFields, k.GetFieldName())
	}
	return
}

func (c *ClickHouse) TimeFieldEqual(param view.ReqQuery, tid int) string {
	var res string
	s := c.logsTimelineSQL(param, tid)
	out, err := c.doQuery(s)
	if err != nil {
		invoker.Logger.Error("TimeFieldEqual", elog.Any("step", "logsSQL"), elog.Any("sql", s), elog.String("error", err.Error()))
		return res
	}
	for _, v := range out {
		if v[param.TimeField] != nil {
			switch v[param.TimeField].(type) {
			case time.Time:
				t := v[param.TimeField].(time.Time)
				if res == "" {
					res = genTimeConditionEqual(param, t)
				} else {
					if !strings.Contains(res, genTimeConditionEqual(param, t)) {
						res = fmt.Sprintf("%s or %s", res, genTimeConditionEqual(param, t))
					}
				}
			default:
				invoker.Logger.Warn("TimeFieldEqual", elog.Any("step", "logsSQL"), elog.Any("type", reflect.TypeOf(v[param.TimeField])))
			}
		}
	}
	invoker.Logger.Debug("TimeFieldEqual", elog.Any("step", "logsSQL"), elog.Any("res", "("+res+")"))
	if res == "" {
		return res
	}
	return "(" + res + ")"
}

func (c *ClickHouse) Count(param view.ReqQuery) (res uint64, err error) {
	q := c.countSQL(param)
	sqlCountData, err := c.doQuery(q)
	if err != nil {
		invoker.Logger.Error("Count", elog.Any("sql", q), elog.Any("error", err.Error()))
		return 0, err
	}
	if len(sqlCountData) > 0 {
		if sqlCountData[0]["count"] != nil {
			switch sqlCountData[0]["count"].(type) {
			case uint64:
				return sqlCountData[0]["count"].(uint64), nil
			}
		}
	}
	return 0, nil
}

func (c *ClickHouse) GroupBy(param view.ReqQuery) (res map[string]uint64) {
	res = make(map[string]uint64, 0)
	sqlCountData, err := c.doQuery(c.groupBySQL(param))
	if err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("sql", c.groupBySQL(param)), elog.FieldErr(err))
		return
	}
	invoker.Logger.Debug("ClickHouse", elog.Any("sqlCountData", sqlCountData))
	for _, v := range sqlCountData {
		if v["count"] != nil {
			var key string
			switch v["f"].(type) {
			case string:
				key = v["f"].(string)
			case *string:
				key = *(v["f"].(*string))
			case uint16:
				key = fmt.Sprintf("%d", v["f"].(uint16))
			case int32:
				key = fmt.Sprintf("%d", v["f"].(int32))
			case *int64:
				key = fmt.Sprintf("%d", *(v["f"].(*int64)))
			case int64:
				key = fmt.Sprintf("%d", v["f"].(int64))
			case *float64:
				key = fmt.Sprintf("%f", *(v["f"].(*float64)))
			case float64:
				key = fmt.Sprintf("%f", v["f"].(float64))
			default:
				invoker.Logger.Info("GroupBy", elog.Any("type", reflect.TypeOf(v["f"])))
				continue
			}
			res[key] = v["count"].(uint64)
		}
	}
	return
}

func (c *ClickHouse) Databases() ([]*view.RespDatabaseSelfBuilt, error) {
	databases := make([]*view.RespDatabaseSelfBuilt, 0)
	dm := make(map[string][]*view.RespTablesSelfBuilt)
	query := fmt.Sprintf("select database, name from system.tables")
	list, err := c.doQuery(query)
	if err != nil {
		return nil, err
	}
	for _, row := range list {
		d := row["database"].(string)
		t := row["name"].(string)
		if _, ok := dm[d]; !ok {
			dm[d] = make([]*view.RespTablesSelfBuilt, 0)
		}
		dm[d] = append(dm[d], &view.RespTablesSelfBuilt{
			Name: t,
		})
	}
	for databaseName, tables := range dm {
		databases = append(databases, &view.RespDatabaseSelfBuilt{
			Name:   databaseName,
			Tables: tables,
		})
	}
	return databases, nil
}

func (c *ClickHouse) Columns(database, table string, isTimeField bool) (res []*view.RespColumn, err error) {
	res = make([]*view.RespColumn, 0)
	var query string
	if isTimeField {
		query = fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s' and (`type` like %s or `type` like %s)",
			database, table, "'%Int%'", "'%DateTime%'")
	} else {
		query = fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s'", database, table)
	}
	list, err := c.doQuery(query)
	if err != nil {
		return
	}
	for _, row := range list {
		typeDesc := row["type"].(string)
		res = append(res, &view.RespColumn{
			Name:     row["name"].(string),
			TypeDesc: typeDesc,
			Type:     fieldTypeJudgment(typeDesc),
		})
	}
	return
}

func fieldTypeJudgment(typ string) int {
	for key, val := range typORM {
		if strings.Contains(typ, val) {
			return key
		}
	}
	return -1
}

// IndexUpdate Data table index operation
func (c *ClickHouse) IndexUpdate(database db.BaseDatabase, table db.BaseTable, adds map[string]*db.BaseIndex, dels map[string]*db.BaseIndex, newList map[string]*db.BaseIndex) (err error) {
	// step 1 drop
	alertSQL := ""
	for _, del := range dels {
		if c.mode == ModeCluster {
			if del.HashTyp == db.HashTypeSip || del.HashTyp == db.HashTypeURL {
				hashFieldName, ok := del.GetHashFieldName()
				if ok {
					sql1 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ON CLUSTER `%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, database.Cluster, hashFieldName)
					_, err = c.db.Exec(sql1)
					if err != nil {
						return err
					}
					alertSQL += fmt.Sprintf("%s\n", sql1)
					sql2 := fmt.Sprintf("ALTER TABLE `%s`.`%s_local` ON CLUSTER `%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, database.Cluster, hashFieldName)
					_, err = c.db.Exec(sql2)
					if err != nil {
						return err
					}
					alertSQL += fmt.Sprintf("%s\n", sql2)
				}
			}
			sql1 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ON CLUSTER `%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, database.Cluster, del.GetFieldName())
			_, err = c.db.Exec(sql1)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql1)
			sql2 := fmt.Sprintf("ALTER TABLE `%s`.`%s_local` ON CLUSTER `%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, database.Cluster, del.GetFieldName())
			_, err = c.db.Exec(sql2)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql2)
		} else {
			if del.HashTyp == db.HashTypeSip || del.HashTyp == db.HashTypeURL {
				hashFieldName, ok := del.GetHashFieldName()
				if ok {
					sql3 := fmt.Sprintf("ALTER TABLE `%s`.`%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, hashFieldName)
					_, err = c.db.Exec(sql3)
					if err != nil {
						return err
					}
					alertSQL += fmt.Sprintf("%s\n", sql3)
				}
			}
			sql3 := fmt.Sprintf("ALTER TABLE `%s`.`%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, del.GetFieldName())
			_, err = c.db.Exec(sql3)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql3)
		}
	}
	// step 2 add
	for _, add := range adds {
		if c.mode == ModeCluster {
			if add.HashTyp == db.HashTypeSip || add.HashTyp == db.HashTypeURL {
				hashFieldName, ok := add.GetHashFieldName()
				if ok {
					sql1 := fmt.Sprintf("ALTER TABLE `%s`.`%s_local` ON CLUSTER `%s` ADD COLUMN IF NOT EXISTS `%s` %s;", database.Name, table.Name, database.Cluster, hashFieldName, typORM[4])
					_, err = c.db.Exec(sql1)
					if err != nil {
						return err
					}
					alertSQL += fmt.Sprintf("%s\n", sql1)
					sql2 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ON CLUSTER `%s` ADD COLUMN IF NOT EXISTS `%s` %s;", database.Name, table.Name, database.Cluster, hashFieldName, typORM[4])
					_, err = c.db.Exec(sql2)
					if err != nil {
						return err
					}
					alertSQL += fmt.Sprintf("%s\n", sql2)
				}
			}
			sql1 := fmt.Sprintf("ALTER TABLE `%s`.`%s_local` ON CLUSTER `%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, database.Cluster, add.GetFieldName(), typORM[add.Typ])
			_, err = c.db.Exec(sql1)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql1)
			sql2 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ON CLUSTER `%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, database.Cluster, add.GetFieldName(), typORM[add.Typ])
			_, err = c.db.Exec(sql2)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql2)
		} else {
			if add.HashTyp == db.HashTypeSip || add.HashTyp == db.HashTypeURL {
				hashFieldName, ok := add.GetHashFieldName()
				if ok {
					sql3 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN IF NOT EXISTS `%s` %s;", database.Name, table.Name, hashFieldName, typORM[4])
					_, err = c.db.Exec(sql3)
					if err != nil {
						return err
					}
					alertSQL += fmt.Sprintf("%s\n", sql3)
				}
			}
			sql3 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, add.GetFieldName(), typORM[add.Typ])
			_, err = c.db.Exec(sql3)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql3)
		}
	}
	tx := invoker.Db.Begin()
	// step 3 rebuild view
	// step 3.1 default view
	defaultViewSQL, err := c.viewOperator(table.Typ, table.ID, database.ID, table.Name, "", nil, nil, newList, true)
	if err != nil {
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["sql_view"] = defaultViewSQL
	if alertSQL != "" {
		ups["sql_data"] = fmt.Sprintf("%s\n%s", table.SqlData, alertSQL)
	}
	err = db.TableUpdate(tx, table.ID, ups)
	if err != nil {
		tx.Rollback()
		return err
	}
	condsViews := egorm.Conds{}
	condsViews["tid"] = table.ID
	viewList, err := db.ViewList(invoker.Db, condsViews)
	invoker.Logger.Debug("IndexUpdate", elog.Any("viewList", viewList))
	for _, current := range viewList {
		innerViewSQL, errViewOperator := c.viewOperator(table.Typ, table.ID, database.ID, table.Name, current.Key, current, viewList, newList, true)
		if errViewOperator != nil {
			tx.Rollback()
			return errViewOperator
		}
		upsView := make(map[string]interface{}, 0)
		upsView["sql_view"] = innerViewSQL
		errViewUpdate := db.ViewUpdate(tx, current.ID, upsView)
		if errViewUpdate != nil {
			tx.Rollback()
			return errViewUpdate
		}
	}
	if err = tx.Commit().Error; err != nil {
		return err
	}
	return nil
}

func (c *ClickHouse) logsTimelineSQL(param view.ReqQuery, tid int) (sql string) {
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, _ := db.ViewList(invoker.Db, conds)
	orderByField := param.TimeField
	if len(views) > 0 {
		orderByField = db.TimeFieldNanoseconds
	}
	sql = fmt.Sprintf("SELECT %s FROM %s WHERE "+genTimeCondition(param)+" %s ORDER BY "+orderByField+" DESC LIMIT %d",
		param.TimeField,
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true),
		param.PageSize*param.Page)
	invoker.Logger.Debug("logsTimelineSQL", elog.Any("step", "logsSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) logsSQL(param view.ReqQuery, tid int) (sql, optSQL, originalWhere string) {
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, _ := db.ViewList(invoker.Db, conds)
	orderByField := param.TimeField
	if len(views) > 0 {
		orderByField = db.TimeFieldNanoseconds
	}
	selectFields := genSelectFields(tid)
	// Request for the first 100 pages of data
	// optimizing, the idea is to reduce the number of fields involved in operation;
	if param.Page*param.PageSize <= 100 {
		timeFieldEqual := c.TimeFieldEqual(param, tid)
		if timeFieldEqual != "" {
			optSQL = fmt.Sprintf("SELECT %s FROM %s WHERE %s %s ORDER BY "+orderByField+" DESC LIMIT %d OFFSET %d",
				selectFields,
				param.DatabaseTable,
				timeFieldEqual,
				c.queryTransform(param, true),
				param.PageSize, (param.Page-1)*param.PageSize)
			invoker.Logger.Debug("ClickHouse", elog.Any("step", "logsSQL"), elog.Any("timeFieldEqual", timeFieldEqual), elog.Any("sql", sql))
		}
	}
	originalWhere = c.queryTransform(param, false)
	sql = fmt.Sprintf("SELECT %s FROM %s WHERE "+genTimeCondition(param)+" %s ORDER BY "+orderByField+" DESC LIMIT %d OFFSET %d",
		selectFields,
		param.DatabaseTable,
		param.ST, param.ET,
		originalWhere,
		param.PageSize, (param.Page-1)*param.PageSize)
	invoker.Logger.Debug("ClickHouse", elog.Any("step", "logsSQL"), elog.Any("sql", sql), elog.Any("optSQL", optSQL))
	return
}

func alarmAggregationSQLWith(param view.ReqQuery) (sql string) {
	out := fmt.Sprintf(`with(
select val from (%s) limit 1
) as limbo
SELECT
   limbo as "metrics",
   %s as timestamp
FROM  %s GROUP BY %s ORDER BY %s DESC LIMIT 10
`, adaSelectPart(param.Query), param.TimeField, param.DatabaseTable, param.TimeField, param.TimeField)
	invoker.Logger.Debug("alarmAggregationSQL", elog.Any("out", out), elog.Any("param", param))
	return out
}

func adaSelectPart(in string) (out string) {
	arr := strings.Split(strings.Replace(in, "from", "FROM", 1), "FROM ")
	if len(arr) <= 1 {
		return in
	}
	if strings.Contains(arr[0], ",") {
		return in
	}
	trimSelect := strings.Replace(arr[0], "select", "", 1)
	trimSelect = strings.Replace(trimSelect, "SELECT", "", 1)
	trimSelect = strings.Replace(trimSelect, "\n", "", 1)
	onlySelect := strings.TrimSpace(trimSelect)
	return fmt.Sprintf("%s,%s FROM %s", arr[0], onlySelect, arr[1])
}

func genSelectFields(tid int) string {
	tableInfo, _ := db.TableInfo(invoker.Db, tid)
	if tableInfo.CreateType == constx.TableCreateTypeCV {
		if tableInfo.SelectFields != "" {
			return tableInfo.SelectFields
		}
		return "_source_,_cluster_,_log_agent_,_namespace_,_node_name_,_node_ip_,_container_name_,_pod_name_,_time_second_,_time_nanosecond_,_raw_log_"
	}
	return "*"
}

func (c *ClickHouse) queryTransform(params view.ReqQuery, isOptimized bool) string {
	if isOptimized {
		params.Query = queryTransformHash(params) // hash transform
	}
	table, _ := db.TableInfo(invoker.Db, params.Tid)
	query := queryTransformLike(table.CreateType, table.RawLogField, params.Query) // _raw_log_ like
	if query == "" {
		return query
	}
	return fmt.Sprintf("AND (%s)", query)
}

func queryTransformLike(createType int, rawLogField, query string) string {
	if query == "" {
		return query
	}
	var res string
	andArr := likeTransformAndArr(query)
	if len(andArr) > 0 {
		for k, item := range andArr {
			item = strings.TrimSpace(item)
			if k == 0 {
				res = likeTransformField(createType, rawLogField, item)
				continue
			}
			res = fmt.Sprintf("%s AND %s", res, likeTransformField(createType, rawLogField, item))
		}
		return res
	}
	return likeTransformField(createType, rawLogField, query)
}

func likeTransformField(createType int, rawLogField, query string) string {
	if strings.Contains(query, "=") ||
		strings.Contains(query, "like") ||
		strings.Contains(query, ">") ||
		strings.Contains(query, "<") {
		return query
	}
	return likeTransform(createType, rawLogField, query)
}

func likeTransformAndArr(query string) []string {
	var res = make([]string, 0)
	if strings.Contains(query, " AND ") {
		res = strings.Split(query, " AND ")
	}
	if strings.Contains(query, " and ") {
		res = strings.Split(query, " and ")
	}
	return res
}

func queryTransformHash(params view.ReqQuery) string {
	query := params.Query
	conds := egorm.Conds{}
	conds["tid"] = params.Tid
	conds["hash_typ"] = egorm.Cond{Op: "!=", Val: 0}
	indexes, _ := db.IndexList(conds)
	for _, index := range indexes {
		if index.HashTyp == 0 {
			continue
		}
		query = hashTransform(query, index)
	}
	invoker.Logger.Debug("countSQL", elog.Any("step", "queryTransform"), elog.Any("indexes", indexes), elog.Any("query", query))
	if query == defaultCondition {
		return ""
	}
	return query
}

func likeTransform(createType int, rawLogField, query string) string {
	field := "_raw_log_"
	if createType == constx.TableCreateTypeExist && rawLogField != "" {
		field = rawLogField
	}
	query = strings.ReplaceAll(query, "'", "")
	query = strings.ReplaceAll(query, "\"", "")
	query = strings.ReplaceAll(query, "`", "")
	query = strings.TrimSpace(query)
	return field + " like '%" + query + "%'"
}

func hashTransform(query string, index *db.BaseIndex) string {
	var (
		key              = index.GetFieldName()
		hashTyp          = index.HashTyp
		hashFieldName, _ = index.GetHashFieldName()
	)
	if strings.Contains(query, key+"=") && (hashTyp == 1 || hashTyp == 2) {
		cache := query
		r, _ := regexp.Compile(key + "='(\\S*)'")
		val := r.FindString(query)
		val = strings.Replace(val, key+"=", "", 1)
		query = strings.Replace(query, key+"=", hashFieldName+"=", 1)
		if hashTyp == db.HashTypeSip {
			query = strings.Replace(query, val, fmt.Sprintf("sipHash64(%s)", val), 1)
		}
		if hashTyp == db.HashTypeURL {
			query = strings.Replace(query, val, fmt.Sprintf("URLHash(%s)", val), 1)
		}
		if !strings.HasPrefix(query, "_inner") && !strings.Contains(query, " _inner") {
			query = cache
		}
	}
	return query
}

func (c *ClickHouse) countSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count FROM %s WHERE "+genTimeCondition(param)+" %s",
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true))
	invoker.Logger.Debug("countSQL", elog.Any("step", "countSQL"), elog.Any("param", param), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) groupBySQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, `%s` as f FROM %s WHERE "+genTimeCondition(param)+" %s group by `%s`  order by count desc limit 10",
		param.Field,
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true),
		param.Field)
	return
}

func (c *ClickHouse) doQuery(sql string) (res []map[string]interface{}, err error) {
	res = make([]map[string]interface{}, 0)
	rows, err := c.db.Query(sql)
	if err != nil {
		return res, errors.Wrap(err, sql)
	}
	defer func() { _ = rows.Close() }()
	cts, _ := rows.ColumnTypes()
	var (
		fields = make([]string, len(cts))
		values = make([]interface{}, len(cts))
	)
	for idx, field := range cts {
		fields[idx] = field.Name()
	}
	for rows.Next() {
		line := make(map[string]interface{}, 0)
		for idx := range values {
			fieldValue := reflect.ValueOf(&values[idx]).Elem()
			values[idx] = fieldValue.Addr().Interface()
		}
		if err = rows.Scan(values...); err != nil {
			return res, errors.Wrap(err, sql)
		}
		for k := range fields {
			if isEmpty(values[k]) {
				line[fields[k]] = ""
			} else {
				line[fields[k]] = values[k]
			}
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		return res, errors.Wrap(err, sql)
	}
	return
}

func (c *ClickHouse) SystemTablesInfo() (res []*view.SystemTable) {
	res = make([]*view.SystemTable, 0)
	// s := fmt.Sprintf("select * from system.tables where metadata_modification_time>toDateTime(%d)", time.Now().Add(-time.Minute*10).Unix())
	// Get full data if it is reset mode
	s := "select * from system.tables"
	deps, err := c.doQuery(s)
	if err != nil {
		invoker.Logger.Error("SystemTablesInfo", elog.Any("s", s), elog.Any("deps", deps), elog.Any("error", err))
		return
	}
	for _, table := range deps {
		row := view.SystemTable{
			Database:         table["database"].(string),
			Table:            table["name"].(string),
			Engine:           table["engine"].(string),
			CreateTableQuery: table["create_table_query"].(string),
		}
		row.DownDatabaseTable = make([]string, 0)
		if table["total_bytes"] != nil {
			switch table["total_rows"].(type) {
			case *uint64:
				row.TotalBytes = *table["total_bytes"].(*uint64)
			}
		}
		if table["total_rows"] != nil {
			switch table["total_rows"].(type) {
			case *uint64:
				row.TotalRows = *table["total_rows"].(*uint64)
			}
		}
		databases := table["dependencies_database"].([]string)
		tables := table["dependencies_table"].([]string)
		if len(tables) != len(databases) {
			continue
		}
		for key := range tables {
			row.DownDatabaseTable = append(row.DownDatabaseTable, fmt.Sprintf("%s.%s", databases[key], tables[key]))
		}
		res = append(res, &row)
	}
	return
}

// func getUnixTime(val map[string]interface{}) (int64, bool) {
// 	v, ok := val[db.TimeFieldNanoseconds]
// 	if !ok {
// 		return 0, false
// 	}
// 	switch v.(type) {
// 	case time.Time:
// 		return v.(time.Time).UnixNano(), true
// 	}
// 	return 0, false
// }

// isEmpty filter empty index value
func isEmpty(input interface{}) bool {
	var val string
	switch input.(type) {
	case string:
		val = input.(string)
	case uint16:
		val = fmt.Sprintf("%d", input.(uint16))
	case uint64:
		val = fmt.Sprintf("%d", input.(uint64))
	case int32:
		val = fmt.Sprintf("%d", input.(int32))
	case int64:
		val = fmt.Sprintf("%d", input.(int64))
	case float64:
		val = fmt.Sprintf("%f", input.(float64))
	default:
		if reflect.TypeOf(input) == nil {
			return true
		}
		invoker.Logger.Warn("isEmpty", elog.String("val", val), elog.Any("type", reflect.TypeOf(input)))
		return false
	}
	if val == "" || val == "NaN" {
		return true
	}
	return false
}

// StorageCreate create default stream data table and view
func (c *ClickHouse) StorageCreate(did int, database db.BaseDatabase, ct view.ReqStorageCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	dName := genNameWithMode(c.mode, database.Name, ct.TableName)
	dStreamName := genStreamNameWithMode(c.mode, database.Name, ct.TableName)
	// build view statement
	var timeTyp string
	if ct.Typ == TableTypeString {
		timeTyp = "String"
	} else if ct.Typ == TableTypeFloat {
		timeTyp = "Float64"
	} else {
		err = errors.New("invalid time type")
		return
	}
	dataParams := bumo.Params{
		KafkaJsonMapping: ct.Mapping2String(true),
		LogField:         ct.RawLogField,
		TimeField:        ct.TimeField,
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	}
	streamParams := bumo.Params{
		KafkaJsonMapping: ct.Mapping2String(true),
		LogField:         ct.RawLogField,
		TimeField:        ct.TimeField,
		Stream: bumo.ParamsStream{
			TableName:               dStreamName,
			TableTyp:                timeTyp,
			Brokers:                 ct.Brokers,
			Topic:                   ct.Topics,
			Group:                   database.Name + "_" + ct.TableName,
			ConsumerNum:             ct.Consumers,
			KafkaSkipBrokenMessages: ct.KafkaSkipBrokenMessages,
		},
	}
	if c.mode == ModeCluster {
		dataParams.Cluster = database.Cluster
		dataParams.ReplicaStatus = c.rs
		streamParams.Cluster = database.Cluster
		streamParams.ReplicaStatus = c.rs
		dDataSQL = builder.Do(new(cluster.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
	} else {
		dDataSQL = builder.Do(new(standalone.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
	}
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.storageViewOperator(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true, ct)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
		return
	}
	if c.mode == ModeCluster {
		dDistributedSQL = builder.Do(new(cluster.DataBuilder), bumo.Params{
			Cluster:       database.Cluster,
			ReplicaStatus: c.rs,
			Data: bumo.ParamsData{
				DataType:    bumo.DataTypeDistributed,
				TableName:   genName(database.Name, ct.TableName),
				SourceTable: dName,
			},
		})
		invoker.Logger.Debug("TableCreate", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			invoker.Logger.Error("TableCreate", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	return
}

// AlterMergeTreeTable ...
// ALTER TABLE dev.test MODIFY TTL toDateTime(time_second) + toIntervalDay(7)
func (c *ClickHouse) AlterMergeTreeTable(tableInfo *db.BaseTable, params view.ReqStorageUpdate) (err error) {
	s := fmt.Sprintf("ALTER TABLE %s%s MODIFY TTL toDateTime(_time_second_) + toIntervalDay(%d)",
		genNameWithMode(c.mode, tableInfo.Database.Name, tableInfo.Name),
		genSQLClusterInfo(c.mode, tableInfo.Database.Cluster),
		params.MergeTreeTTL)
	_, err = c.db.Exec(s)
	if err != nil {
		invoker.Logger.Error("AlterMergeTreeTable", elog.Any("sql", s), elog.Any("err", err.Error()))
		return
	}
	return
}

// ReCreateKafkaTable Drop and Create
func (c *ClickHouse) ReCreateKafkaTable(tableInfo *db.BaseTable, params view.ReqStorageUpdate) (streamSQL string, err error) {
	currentKafkaSQL := tableInfo.SqlStream
	// Drop Table
	dropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s%s",
		genStreamNameWithMode(c.mode, tableInfo.Database.Name, tableInfo.Name),
		genSQLClusterInfo(c.mode, tableInfo.Database.Cluster))
	if _, err = c.db.Exec(dropSQL); err != nil {
		invoker.Logger.Error("ReCreateKafkaTable", elog.Any("dropSQL", dropSQL), elog.Any("err", err.Error()))
		return
	}
	// Create Table
	streamParams := bumo.Params{
		TableCreateType: tableInfo.CreateType,
		Stream: bumo.ParamsStream{
			TableName:               genStreamNameWithMode(c.mode, tableInfo.Database.Name, tableInfo.Name),
			TableTyp:                TableTypStr(tableInfo.Typ),
			Group:                   tableInfo.Database.Name + "_" + tableInfo.Name,
			Brokers:                 params.KafkaBrokers,
			Topic:                   params.KafkaTopic,
			ConsumerNum:             params.KafkaConsumerNum,
			KafkaSkipBrokenMessages: params.KafkaSkipBrokenMessages,
		},
	}
	if c.mode == ModeCluster {
		streamParams.Cluster = tableInfo.Database.Cluster
		streamParams.ReplicaStatus = c.rs
		streamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
	} else {
		streamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
	}

	invoker.Logger.Error("ReCreateKafkaTable", elog.Any("params", params))

	if _, err = c.db.Exec(streamSQL); err != nil {
		invoker.Logger.Error("ReCreateKafkaTable", elog.Any("streamSQL", streamSQL), elog.Any("err", err.Error()))
		_, _ = c.db.Exec(currentKafkaSQL)
		return
	}
	return
}

func TableTypStr(typ int) string {
	if typ == TableTypeString {
		return "String"
	} else if typ == TableTypeFloat {
		return "Float64"
	}
	return ""
}
