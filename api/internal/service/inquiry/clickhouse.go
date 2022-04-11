package inquiry

import (
	"database/sql"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder"
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/cluster"
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/standalone"
	"github.com/shimohq/mogo/api/pkg/constx"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func genTimeCondition(param view.ReqQuery) string {
	if param.TimeFieldType == db.TimeFieldTypeTsMs {
		return fmt.Sprintf("intDiv(%s,1000) >= %s and intDiv(%s,1000) < %s", param.TimeField, "%d", param.TimeField, "%d")
	}
	return param.TimeField + " >= %d AND " + param.TimeField + " < %d"
}

const defaultStringTimeParse = `parseDateTimeBestEffort(_time_) AS _time_second_,
  toDateTime64(parseDateTimeBestEffort(_time_), 9, 'Asia/Shanghai') AS _time_nanosecond_`

const defaultFloatTimeParse = `toDateTime(toInt64(_time_)) AS _time_second_,
  fromUnixTimestamp64Nano(toInt64(_time_*1000000000),'Asia/Shanghai') AS _time_nanosecond_`

// time_field 高精度数据解析选择
var nanosecondTimeParse = `toDateTime(toInt64(JSONExtractFloat(_log_, '%s'))) AS _time_second_, 
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(_log_, '%s')*1000000000),'Asia/Shanghai') AS _time_nanosecond_`

type typORMItem struct {
	Filter string
	Key    string
}

var typORM = map[int]typORMItem{
	-2: {
		Filter: "DateTime64(3)",
		Key:    "DateTime64(3)",
	},
	-1: {
		Filter: "DateTime",
		Key:    "DateTime",
	},
	0: {
		Filter: "String",
		Key:    "String",
	},
	1: {
		Filter: "Int",
		Key:    "Int64",
	},
	2: {
		Filter: "Float",
		Key:    "Float64",
	},
	3: {
		Filter: "JSON",
		Key:    "JSON",
	},
}

var jsonExtractORM = map[int]string{
	0: "toString",
	1: "toInt64OrNull",
	2: "toFloat64OrNull",
}

const (
	ModeStandalone int = iota
	ModeCluster
)

type ClickHouse struct {
	id   int
	mode int
	db   *sql.DB
}

func NewClickHouse(db *sql.DB, ins *db.Instance) *ClickHouse {
	if ins.ID == 0 {
		panic("clickhouse add err, id is 0")
	}
	return &ClickHouse{
		db:   db,
		id:   ins.ID,
		mode: ins.Mode,
	}
}

func (c *ClickHouse) ID() int {
	return c.id
}

func (c *ClickHouse) genJsonExtractSQL(indexes map[string]*db.Index) string {
	jsonExtractSQL := ",\n"
	for _, obj := range indexes {
		if obj.RootName == "" {
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(%s(JSONExtractString(_log_, '%s'))) AS `%s`,\n", jsonExtractORM[obj.Typ], obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(JSONExtractString(_log_, '%s')) AS `%s`,\n", jsonExtractORM[obj.Typ], obj.Field, obj.GetFieldName())
		} else {
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(%s(JSONExtractString(JSONExtractRaw(_log_, '%s'), '%s'))) AS `%s`,\n", jsonExtractORM[obj.Typ], obj.RootName, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(JSONExtractString(JSONExtractRaw(_log_, '%s'), '%s')) AS `%s`,\n", jsonExtractORM[obj.Typ], obj.RootName, obj.Field, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",\n")
	return jsonExtractSQL
}

func (c *ClickHouse) whereConditionSQLCurrent(current *db.View) string {
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(_log_, '%s') = 1", current.Key)
}

func (c *ClickHouse) whereConditionSQLDefault(list []*db.View) string {
	if list == nil {
		return "1=1"
	}
	var defaultSQL string
	// It is required to obtain all the view parameters under the current table and construct the default and current view query conditions
	for k, viewRow := range list {
		if k == 0 {
			defaultSQL = fmt.Sprintf("JSONHas(_log_, '%s') = 0", viewRow.Key)
		} else {
			defaultSQL = fmt.Sprintf("%s AND JSONHas(_log_, '%s') = 0", defaultSQL, viewRow.Key)
		}
	}
	if defaultSQL == "" {
		return "1=1"
	}
	return defaultSQL
}

func (c *ClickHouse) timeParseSQL(typ int, v *db.View) string {
	if v.Format == "fromUnixTimestamp64Micro" && v.IsUseDefaultTime == 0 {
		return fmt.Sprintf(nanosecondTimeParse, v.Key, v.Key)
	}
	invoker.Logger.Debug("timeParseSQL", elog.Any("typ", typ))
	if typ == TimeTypeString {
		return defaultStringTimeParse
	}
	return defaultFloatTimeParse
}

// ViewSync
// delete: list need remove current
// update: list need update current
// create: list need add current
func (c *ClickHouse) ViewSync(table db.Table, current *db.View, list []*db.View, isAddOrUpdate bool) (dViewSQL, cViewSQL string, err error) {
	// build view statement
	conds := egorm.Conds{}
	conds["tid"] = table.ID
	indexes, err := db.IndexList(conds)
	if err != nil {
		return
	}
	indexMap := make(map[string]*db.Index)
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
		res.Query = "1='1'"
	}
	if res.ST == 0 {
		res.ST = time.Now().Add(-time.Hour).Unix()
	}
	if res.ET == 0 {
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
		views []*db.View
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
func (c *ClickHouse) TableCreate(did int, database db.Database, ct view.ReqTableCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	dName := genName(database.Name, ct.TableName)
	dStreamName := genStreamName(database.Name, ct.TableName)
	if c.mode == ModeCluster {
		dName = genName(database.Name, ct.TableName+"_local")
		dStreamName = genStreamName(database.Name, ct.TableName+"_local")
	}
	// build view statement
	var timeTyp = "String"
	if ct.Typ == TimeTypeString {
		timeTyp = "String"
	} else if ct.Typ == TimeTypeFloat {
		timeTyp = "Float64"
	} else {
		err = errors.New("invalid time type")
		return
	}
	dataParams := bumo.Params{
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	}
	streamParams := bumo.Params{
		Stream: bumo.ParamsStream{
			TableName:   dStreamName,
			TimeTyp:     timeTyp,
			Brokers:     ct.Brokers,
			Topic:       ct.Topics,
			Group:       database.Name + "_" + ct.TableName,
			ConsumerNum: ct.Consumers,
		},
	}

	if c.mode == ModeCluster {
		dataParams.Cluster = database.Cluster
		streamParams.Cluster = database.Cluster
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
			Cluster: database.Cluster,
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

func (c *ClickHouse) viewOperator(typ, tid int, did int, table, customTimeField string, current *db.View, list []*db.View, indexes map[string]*db.Index, isCreate bool) (res string, err error) {
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
		jsonExtractSQL = c.genJsonExtractSQL(indexes)
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
		elog.Error("viewOperator", elog.String("viewDropSQL", viewDropSQL),
			elog.String("jsonExtractSQL", jsonExtractSQL),
			elog.String("viewName", viewName),
			elog.String("cluster", databaseInfo.Cluster))
		return "", err
	}
	// create
	if customTimeField == "" {
		// default time field, use _time_
		var dtp string
		if typ == TimeTypeString {
			dtp = defaultStringTimeParse
		} else {
			dtp = defaultFloatTimeParse
		}
		viewSQL = c.ViewDo(bumo.Params{
			Cluster: databaseInfo.Cluster,
			View: bumo.ParamsView{
				ViewTable:    viewName,
				TargetTable:  dName,
				TimeField:    dtp,
				CommonFields: jsonExtractSQL,
				SourceTable:  streamName,
				Where:        c.whereConditionSQLDefault(list),
			},
		})
	} else {
		if current == nil {
			return "", errors.New("the process processes abnormal data errors, current view cannot be nil")
		}
		viewSQL = c.ViewDo(bumo.Params{
			Cluster: databaseInfo.Cluster,
			View: bumo.ParamsView{
				ViewTable:    viewName,
				TargetTable:  dName,
				TimeField:    c.timeParseSQL(typ, current),
				CommonFields: jsonExtractSQL,
				SourceTable:  streamName,
				Where:        c.whereConditionSQLCurrent(current),
			},
		})
	}
	if isCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
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
//        toDate(_timestamp_) as date,
//        %s as name,
//        array(%s) as tags,
//        toFloat64(count(*)) as val,
//        _timestamp_ as ts,
//        toDateTime(_timestamp_) as updated
//    FROM %s WHERE %s GROUP by _timestamp_;`,
func (c *ClickHouse) AlertViewGen(alarm *db.Alarm, filters []*db.AlarmFilter) (string, string, error) {
	var (
		filter          string
		viewSQL         string
		viewTableName   string
		sourceTableName string
	)
	for i, f := range filters {
		if i == 0 {
			filter = f.When
		} else {
			filter = fmt.Sprintf("%s AND %s", filter, f.When)
		}
	}
	tableInfo, err := db.TableInfo(invoker.Db, alarm.Tid)
	if err != nil {
		return "", "", err
	}

	viewTableName = alarm.AlertViewName(tableInfo.Database.Name, tableInfo.Name)
	sourceTableName = fmt.Sprintf("%s.%s", tableInfo.Database.Name, tableInfo.Name)

	viewSQL = c.ViewDo(bumo.Params{
		Cluster: tableInfo.Database.Cluster,
		View: bumo.ParamsView{
			ViewType:     bumo.ViewTypePrometheusMetric,
			ViewTable:    viewTableName,
			TimeField:    tableInfo.GetTimeField(),
			CommonFields: TagsToString(alarm, true),
			SourceTable:  sourceTableName,
			Where:        filter}})
	invoker.Logger.Debug("AlertViewGen", elog.String("viewSQL", viewSQL), elog.String("viewTableName", viewTableName))
	// create
	err = c.alertPrepare()
	if err != nil {
		return "", "", err
	}
	return viewTableName, viewSQL, err
}

func (c *ClickHouse) AlertViewCreate(viewTableName, viewSQL, cluster string) (err error) {
	err = c.AlertViewDrop(viewTableName, cluster)
	if err != nil {
		return
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

func TagsToString(alarm *db.Alarm, withQuote bool) string {
	tags := alarm.Tags
	if alarm.Tags == nil || len(alarm.Tags) == 0 {
		tags = make(map[string]string, 0)
	}
	tags["uuid"] = alarm.Uuid
	result := make([]string, 0)
	for k, v := range tags {
		if withQuote {
			result = append(result, fmt.Sprintf("'%s=%s'", k, v))
		} else {
			result = append(result, fmt.Sprintf(`%s="%s"`, k, v))
		}
	}
	return strings.Join(result, ",")
}

func (c *ClickHouse) GET(param view.ReqQuery, tid int) (res view.RespQuery, err error) {
	// Initialization
	res.Logs = make([]map[string]interface{}, 0)
	res.Keys = make([]*db.Index, 0)
	res.Terms = make([][]string, 0)

	res.Logs, err = c.doQuery(c.logsSQL(param, tid))
	if err != nil {
		return
	}
	if param.TimeField != db.TimeFieldSecond {
		for k := range res.Logs {
			if param.TimeFieldType == db.TimeFieldTypeTsMs {
				res.Logs[k][db.TimeFieldSecond] = res.Logs[k][param.TimeField].(int64) / 1000
			} else {
				res.Logs[k][db.TimeFieldSecond] = res.Logs[k][param.TimeField]
			}
		}
	}
	res.Count = c.Count(param)
	res.Limited = param.PageSize
	// Read the index data
	conds := egorm.Conds{}
	conds["tid"] = tid
	res.Keys, _ = db.IndexList(conds)
	res.HiddenFields = econf.GetStringSlice("app.hiddenFields")
	res.DefaultFields = econf.GetStringSlice("app.defaultFields")
	for _, k := range res.Keys {
		res.DefaultFields = append(res.DefaultFields, k.Field)
	}
	return
}

func (c *ClickHouse) Count(param view.ReqQuery) (res uint64) {
	sqlCountData, err := c.doQuery(c.countSQL(param))
	if err != nil {
		return
	}
	if len(sqlCountData) > 0 {
		if sqlCountData[0]["count"] != nil {
			switch sqlCountData[0]["count"].(type) {
			case uint64:
				return sqlCountData[0]["count"].(uint64)
			}
		}
	}
	return 0
}

func (c *ClickHouse) GroupBy(param view.ReqQuery) (res map[string]uint64) {
	res = make(map[string]uint64, 0)
	sqlCountData, err := c.doQuery(c.groupBySQL(param))
	if err != nil {
		return
	}
	invoker.Logger.Debug("ClickHouse", elog.Any("sqlCountData", sqlCountData))
	for _, v := range sqlCountData {
		if v["count"] != nil {
			var key string
			switch v["f"].(type) {
			case string:
				key = v["f"].(string)
			case uint16:
				key = fmt.Sprintf("%d", v["f"].(uint16))
			case int32:
				key = fmt.Sprintf("%d", v["f"].(int32))
			case int64:
				key = fmt.Sprintf("%d", v["f"].(int64))
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
		query = fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s' and type in (%s)", database, table, strings.Join([]string{"'DateTime64(3)'", "'DateTime'", "'Int32'", "'Int64'"}, ","))
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
	for k, v := range typORM {
		if strings.Contains(typ, v.Filter) {
			return k
		}
	}
	return -1
}

// IndexUpdate Data table index operation
func (c *ClickHouse) IndexUpdate(database db.Database, table db.Table, adds map[string]*db.Index, dels map[string]*db.Index, newList map[string]*db.Index) (err error) {
	// step 1 drop
	alertSQL := ""
	for _, del := range dels {
		if c.mode == ModeCluster {
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
			sql1 := fmt.Sprintf("ALTER TABLE `%s`.`%s_local` ON CLUSTER `%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, database.Cluster, add.GetFieldName(), typORM[add.Typ].Key)
			_, err = c.db.Exec(sql1)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql1)
			sql2 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ON CLUSTER `%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, database.Cluster, add.GetFieldName(), typORM[add.Typ].Key)
			_, err = c.db.Exec(sql2)
			if err != nil {
				return err
			}
			alertSQL += fmt.Sprintf("%s\n", sql2)
		} else {
			sql3 := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, add.GetFieldName(), typORM[add.Typ].Key)
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

func (c *ClickHouse) logsSQL(param view.ReqQuery, tid int) (sql string) {
	// check is use _time_nanosecond_
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, _ := db.ViewList(invoker.Db, conds)
	orderByField := param.TimeField
	if len(views) > 0 {
		orderByField = db.TimeFieldNanoseconds
	}
	sql = fmt.Sprintf("SELECT * FROM %s WHERE %s AND "+genTimeCondition(param)+" ORDER BY "+orderByField+" DESC LIMIT %d OFFSET %d",
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET,
		param.PageSize, (param.Page-1)*param.PageSize)
	invoker.Logger.Debug("ClickHouse", elog.Any("step", "logsSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) countSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count FROM %s WHERE %s AND "+genTimeCondition(param),
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET)
	invoker.Logger.Debug("ClickHouse", elog.Any("step", "countSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) groupBySQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, %s as f FROM %s WHERE %s AND "+genTimeCondition(param)+" group by %s  order by count desc limit 10",
		param.Field,
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET, param.Field)
	invoker.Logger.Debug("ClickHouse", elog.Any("step", "groupBySQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) doQuery(sql string) (res []map[string]interface{}, err error) {
	res = make([]map[string]interface{}, 0)
	rows, err := c.db.Query(sql)
	if err != nil {
		return
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
			invoker.Logger.Error("ClickHouse", elog.Any("step", "doQueryNext"), elog.Any("error", err.Error()))
			return
		}
		invoker.Logger.Debug("ClickHouse", elog.Any("fields", fields), elog.Any("values", values))
		for k, _ := range fields {
			invoker.Logger.Debug("ClickHouse", elog.Any("fields", fields[k]), elog.Any("values", values[k]))
			if isEmpty(values[k]) {
				continue
			}
			line[fields[k]] = values[k]
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "doQuery"), elog.Any("error", err.Error()))
		return
	}
	return
}

func getUnixTime(val map[string]interface{}) (int64, bool) {
	v, ok := val[db.TimeFieldNanoseconds]
	if !ok {
		return 0, false
	}
	switch v.(type) {
	case time.Time:
		return v.(time.Time).UnixNano(), true
	}
	return 0, false
}

// isEmpty filter empty index value
func isEmpty(input interface{}) bool {
	var key string
	switch input.(type) {
	case string:
		key = input.(string)
	case uint16:
		key = fmt.Sprintf("%d", input.(uint16))
	case uint64:
		key = fmt.Sprintf("%d", input.(uint64))
	case int32:
		key = fmt.Sprintf("%d", input.(int32))
	case int64:
		key = fmt.Sprintf("%d", input.(int64))
	case float64:
		key = fmt.Sprintf("%f", input.(float64))
	default:
		if reflect.TypeOf(input) == nil {
			return true
		}
		elog.Warn("isEmpty", elog.String("key", key), elog.Any("type", reflect.TypeOf(input)))
		return false
	}
	if key == "" {
		return true
	}
	return false
}
