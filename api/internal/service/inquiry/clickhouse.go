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
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/standalone"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func genTimeCondition(timeField string) string {
	return timeField + " >= %d AND " + timeField + " < %d"
}

const defaultStringTimeParse = `parseDateTimeBestEffort(_time_) AS _time_second_,
parseDateTimeBestEffort(_time_) AS _time_nanosecond_`

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

type ClickHouse struct {
	id int
	db *sql.DB
}

func NewClickHouse(db *sql.DB, id int) *ClickHouse {
	if id == 0 {
		panic("clickhouse add err, id is 0")
	}
	return &ClickHouse{
		db: db,
		id: id,
	}
}

func (c *ClickHouse) ID() int {
	return c.id
}

func (c *ClickHouse) genJsonExtractSQL(indexes map[string]*db.Index) (string, error) {
	var jsonExtractSQL string
	jsonExtractSQL = ","
	for _, obj := range indexes {
		if obj.RootName == "" {
			jsonExtractSQL += fmt.Sprintf("%s(JSONExtractString(_log_, '%s')) AS `%s`,", jsonExtractORM[obj.Typ], obj.Field, obj.GetFieldName())
		} else {
			jsonExtractSQL += fmt.Sprintf("%s(JSONExtractString(JSONExtractRaw(_log_, '%s'), '%s')) AS `%s`,", jsonExtractORM[obj.Typ], obj.RootName, obj.Field, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",")
	return jsonExtractSQL, nil
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
		res.DatabaseTable = fmt.Sprintf("%s.%s", res.Database, res.Table)
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
func (c *ClickHouse) TableDrop(database, table string, tid int) (err error) {
	var (
		views []*db.View
	)
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, err = db.ViewList(invoker.Db, conds)
	_, err = c.db.Exec(fmt.Sprintf("drop table IF EXISTS %s;", genViewName(database, table, "")))
	if err != nil {
		return err
	}
	// query all view
	for _, v := range views {
		_, err = c.db.Exec(fmt.Sprintf("drop table IF EXISTS %s;", genViewName(database, table, v.Key)))
		if err != nil {
			return err
		}
	}
	_, err = c.db.Exec(fmt.Sprintf("drop table IF EXISTS %s;", genStreamName(database, table)))
	if err != nil {
		return err
	}
	_, err = c.db.Exec(fmt.Sprintf("drop table IF EXISTS %s.%s;", database, table))
	if err != nil {
		return err
	}
	return nil
}

// TableCreate create default stream data table and view
func (c *ClickHouse) TableCreate(did int, database string, ct view.ReqTableCreate) (dStreamSQL, dDataSQL, dViewSQL string, err error) {
	dName := genName(database, ct.TableName)
	dStreamName := genStreamName(database, ct.TableName)
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
	dStreamSQL = builder.Standalone(new(standalone.StreamBuilder), bumo.Params{
		Stream: bumo.ParamsStream{
			TableName:   dStreamName,
			TimeTyp:     timeTyp,
			Brokers:     ct.Brokers,
			Topic:       ct.Topics,
			Group:       database + "_" + ct.TableName,
			ConsumerNum: ct.Consumers,
		},
	})
	dDataSQL = builder.Standalone(new(standalone.DataBuilder), bumo.Params{
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	})

	invoker.Logger.Debug("TableCreate", elog.Any("dStreamSQL", dStreamSQL), elog.Any("dDataSQL", dDataSQL), elog.Any("dViewSQL", dViewSQL))
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		return
	}
	dViewSQL, err = c.viewOperator(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true)
	if err != nil {
		return
	}
	return
}

func (c *ClickHouse) viewOperator(typ, tid int, did int, table, customTimeField string, current *db.View, list []*db.View, indexes map[string]*db.Index, isCreate bool) (res string, err error) {
	databaseInfo, err := db.DatabaseInfo(invoker.Db, did)
	if err != nil {
		return
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
		jsonExtractSQL, err = c.genJsonExtractSQL(indexes)
		if err != nil {
			return "", err
		}
	}
	dName := genName(databaseInfo.Name, table)
	streamName := genStreamName(databaseInfo.Name, table)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
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
		viewSQL = builder.Standalone(new(standalone.ViewBuilder), bumo.Params{
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
		viewSQL = builder.Standalone(new(standalone.ViewBuilder), bumo.Params{
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
			return "", err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouse) DatabaseCreate(name string) error {
	_, err := c.db.Exec(fmt.Sprintf("create database %s;", name))
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

	viewSQL = builder.Standalone(new(standalone.ViewBuilder), bumo.Params{
		View: bumo.ParamsView{
			ViewType:     bumo.ViewTypePrometheusMetric,
			ViewTable:    viewTableName,
			TimeField:    tableInfo.GetTimeField(),
			CommonFields: TagsToString(alarm, true),
			SourceTable:  sourceTableName,
			Where:        filter,
		}})

	invoker.Logger.Debug("AlertViewGen", elog.String("viewSQL", viewSQL), elog.String("viewTableName", viewTableName))
	// create
	err = c.alertPrepare()
	if err != nil {
		return "", "", err
	}
	return viewTableName, viewSQL, err
}

func (c *ClickHouse) AlertViewCreate(viewTableName, viewSQL string) (err error) {
	err = c.AlertViewDrop(viewTableName)
	if err != nil {
		return
	}
	_, err = c.db.Exec(viewSQL)
	return err
}

func (c *ClickHouse) AlertViewDrop(viewTableName string) (err error) {
	return c.DropTable(viewTableName)
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

func (c *ClickHouse) DropTable(name string) error {
	_, err := c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s;", name))
	return err
}

func (c *ClickHouse) DropDatabase(name string) error {
	_, err := c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s;", name))
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
			res.Logs[k][db.TimeFieldSecond] = res.Logs[k][param.TimeField]
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
		query = fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s' and type = '%s'", database, table, "DateTime")
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
	for _, del := range dels {
		qs := fmt.Sprintf("ALTER TABLE `%s`.`%s` DROP COLUMN IF EXISTS `%s`;", database.Name, table.Name, del.GetFieldName())
		_, err = c.db.Exec(qs)
		if err != nil {
			return err
		}
	}
	// step 2 add
	for _, add := range adds {
		qs := fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN IF NOT EXISTS `%s` Nullable(%s);", database.Name, table.Name, add.GetFieldName(), typORM[add.Typ].Key)
		_, err = c.db.Exec(qs)
		if err != nil {
			return err
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
		innerViewSQL, err := c.viewOperator(table.Typ, table.ID, database.ID, table.Name, current.Key, current, viewList, newList, true)
		if err != nil {
			tx.Rollback()
			return err
		}
		upsView := make(map[string]interface{}, 0)
		upsView["sql_view"] = innerViewSQL
		err = db.ViewUpdate(tx, current.ID, upsView)
		if err != nil {
			tx.Rollback()
			return err
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
	sql = fmt.Sprintf("SELECT * FROM %s WHERE %s AND "+genTimeCondition(param.TimeField)+" ORDER BY "+orderByField+" DESC LIMIT %d OFFSET %d",
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET,
		param.PageSize, (param.Page-1)*param.PageSize)
	invoker.Logger.Debug("ClickHouse", elog.Any("step", "logsSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) countSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count FROM %s WHERE %s AND "+genTimeCondition(param.TimeField),
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET)
	invoker.Logger.Debug("ClickHouse", elog.Any("step", "countSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) groupBySQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, %s as f FROM %s WHERE %s AND "+genTimeCondition(param.TimeField)+" group by %s",
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
	// sort by _time_second_
	// sort.Slice(res, func(i, j int) bool {
	// 	vi, oki := getUnixTime(res[i])
	// 	vj, okj := getUnixTime(res[j])
	// 	if oki && okj {
	// 		return vi > vj
	// 	}
	// 	invoker.Logger.Error("doQuery", elog.Any("TimeFieldNanoseconds", res[i][db.TimeFieldNanoseconds]), elog.Any("type", reflect.TypeOf(res[i][db.TimeFieldNanoseconds])))
	// 	return false
	// })
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
