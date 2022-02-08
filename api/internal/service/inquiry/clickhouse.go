package inquiry

import (
	"database/sql"
	"fmt"
	"log"
	"reflect"
	"strings"
	"time"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

const ignoreKey = "_timestamp_"
const timeCondition = "_timestamp_ >= %d AND _timestamp_ < %d"
const defaultTimeParse = "parseDateTimeBestEffort(_time_) AS _timestamp_,parseDateTimeBestEffort(_time_) AS _trace_time_"

var nanosecondTimeParse = `toDateTime(toInt64(JSONExtractFloat(log, '%s'))) AS _timestamp_, 
fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(log, '%s')*1000000000),'Asia/Shanghai') AS _trace_time_`

var typORM = map[int]string{
	0: "String",
	1: "Int64",
	2: "Float64",
}

var jsonExtractORM = map[int]string{
	0: "JSONExtractString",
	1: "JSONExtractInt",
	2: "JSONExtractFloat",
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
		jsonExtractSQL += fmt.Sprintf("%s(log, '%s') AS %s,", jsonExtractORM[obj.Typ], obj.Field, obj.Field)
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",")
	return jsonExtractSQL, nil
}

func (c *ClickHouse) whereConditionSQLCurrent(current *db.View) string {
	return fmt.Sprintf("JSONHas(log, '%s') = 1", current.Key)
}

func (c *ClickHouse) whereConditionSQLDefault(list []*db.View) string {
	if list == nil {
		return "1=1"
	}
	var defaultSQL string
	// It is required to obtain all the view parameters under the current table and construct the default and current view query conditions
	for k, viewRow := range list {
		if k == 0 {
			defaultSQL = fmt.Sprintf("JSONHas(log, '%s') = 0", viewRow.Key)
		} else {
			defaultSQL = fmt.Sprintf("%s AND JSONHas(log, '%s') = 0", defaultSQL, viewRow.Key)
		}
	}
	if defaultSQL == "" {
		return "1=1"
	}
	return defaultSQL
}

func (c *ClickHouse) timeParseSQL(v *db.View) string {
	if v.IsUseDefaultTime == 1 {
		return defaultTimeParse
	}
	if v.Format == "fromUnixTimestamp64Micro" {
		return fmt.Sprintf(nanosecondTimeParse, v.Key, v.Key)
	}
	return defaultTimeParse
}

// ViewSync
// delete: list need remove current
// update: list need update current
// create: list need add current
func (c *ClickHouse) ViewSync(table db.Table, current *db.View, list []*db.View, isAddOrUpdate bool) (dViewSQL, cViewSQL string, err error) {
	// build view statement
	conds := egorm.Conds{}
	conds["table"] = table.Name
	conds["instance_id"] = table.Iid
	conds["database"] = table.Database
	indexes, err := db.IndexList(conds)
	if err != nil {
		return
	}
	indexMap := make(map[string]*db.Index)
	for _, i := range indexes {
		indexMap[i.Field] = i
	}
	elog.Debug("ViewCreate", elog.String("dViewSQL", dViewSQL), elog.String("cViewSQL", cViewSQL))
	dViewSQL, err = c.viewOperator(table.Typ, table.ID, table.Database, table.Name, "", current, list, indexMap, isAddOrUpdate)
	if err != nil {
		return
	}
	cViewSQL, err = c.viewOperator(table.Typ, table.ID, table.Database, table.Name, current.Key, current, list, indexMap, isAddOrUpdate)
	return
}

func (c *ClickHouse) Prepare(res view.ReqQuery) (view.ReqQuery, error) {
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
		res.Query = "1=1"
	}
	if res.ST == 0 {
		res.ST = time.Now().Add(-time.Hour).Unix()
	}
	if res.ET == 0 {
		res.ET = time.Now().Unix()
	}
	var err error
	res.Query, err = queryTransformer(res.Query)
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
func (c *ClickHouse) TableCreate(database string, ct view.ReqTableCreate) (dStreamSQL, dDataSQL, dViewSQL string, err error) {
	dName := genName(database, ct.TableName)
	dStreamName := genStreamName(database, ct.TableName)
	// build view statement
	dStreamSQL = fmt.Sprintf(clickhouseTableStreamORM[ct.Typ], dStreamName, ct.Brokers, ct.Topics, ct.TableName)
	dDataSQL = fmt.Sprintf(clickhouseTableDataORM[ct.Typ], dName, ct.Days)
	elog.Debug("TableCreate", elog.Any("dStreamSQL", dStreamSQL), elog.Any("dDataSQL", dDataSQL), elog.Any("dViewSQL", dViewSQL))
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		return
	}
	dViewSQL, err = c.viewOperator(ct.Typ, 0, database, ct.TableName, "", nil, nil, nil, true)
	if err != nil {
		return
	}
	return
}

func (c *ClickHouse) viewOperator(typ, tid int, database, table, timestampKey string, current *db.View, list []*db.View, indexes map[string]*db.Index, isCreate bool) (res string, err error) {
	viewName := genViewName(database, table, timestampKey)

	defer func() {
		if err != nil {
			elog.Info("viewOperator", elog.Any("tid", tid), elog.Any("timestampKey", timestampKey), elog.Any("database", database), elog.Any("table", table), elog.String("step", "doViewRollback"))
			c.viewRollback(tid, timestampKey)
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
	dName := genName(database, table)
	streamName := genStreamName(database, table)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
		return "", err
	}
	// create
	if timestampKey == "" {
		// default
		viewSQL = fmt.Sprintf(clickhouseViewORM[typ], viewName, dName, defaultTimeParse, jsonExtractSQL, streamName, c.whereConditionSQLDefault(list))
	} else {
		viewSQL = fmt.Sprintf(clickhouseViewORM[typ], viewName, dName, c.timeParseSQL(current), jsonExtractSQL, streamName, c.whereConditionSQLCurrent(current))
	}
	if isCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return "", err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouse) viewRollback(tid int, key string) {
	tableInfo, err := db.TableInfo(invoker.Db, tid)
	if err != nil {
		elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "doViewRollback"))
		return
	}
	var viewSQL = ""
	if key == "" {
		// defaultView
		viewSQL = tableInfo.SqlView
	} else {
		// ts view
		condsView := egorm.Conds{}
		condsView["tid"] = tid
		condsView["key"] = key
		viewInfo, err := db.ViewInfoX(condsView)
		if err != nil {
			elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "doViewRollbackViewInfoX"))
			return
		}
		viewSQL = viewInfo.SqlView
	}
	_, err = c.db.Exec(viewSQL)
	if err != nil {
		elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("viewSQL", viewSQL))
		return
	}
}

func (c *ClickHouse) GET(param view.ReqQuery) (res view.RespQuery, err error) {
	// Initialization
	res.Logs = make([]map[string]interface{}, 0)
	res.Keys = make([]string, 0)
	res.Terms = make([][]string, 0)

	res.Logs, err = c.doQuery(c.logsSQL(param))
	if err != nil {
		return
	}
	res.Count = c.Count(param)
	res.Limited = param.PageSize
	// Read the index data
	conds := egorm.Conds{}
	conds["instance_id"] = param.InstanceId
	conds["database"] = param.Database
	conds["table"] = param.Table
	indexes, _ := db.IndexList(conds)
	for _, i := range indexes {
		res.Keys = append(res.Keys, i.Field)
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
	elog.Debug("ClickHouse", elog.Any("sqlCountData", sqlCountData))
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
				elog.Info("GroupBy", elog.Any("type", reflect.TypeOf(v["f"])))
				continue
			}
			res[key] = v["count"].(uint64)
		}
	}
	return
}

func (c *ClickHouse) Tables(database string) (res []string, err error) {
	res = make([]string, 0)
	list, err := c.doQuery(fmt.Sprintf("select table, count(*) as c from system.columns a left join system.tables b on a.table = b.name where a.database = '%s' and a.name = '%s' and a.type = '%s' and b.engine != 'MaterializedView' group by table", database, ignoreKey, "DateTime"))
	if err != nil {
		return
	}
	for _, row := range list {
		if count, ok := row["c"]; ok {
			if count.(uint64) == 0 {
				continue
			}
		}
		res = append(res, row["table"].(string))
	}
	return
}

func (c *ClickHouse) Databases() (res []view.RespDatabase, err error) {
	instance, _ := db.InstanceInfo(invoker.Db, c.id)
	list, err := c.doQuery(fmt.Sprintf("select database, count(*) as c from system.columns group by database"))
	if err != nil {
		return
	}
	for _, row := range list {
		if count, ok := row["c"]; ok {
			if count.(uint64) == 0 {
				continue
			}
		}
		res = append(res, view.RespDatabase{
			DatabaseName:   row["database"].(string),
			InstanceName:   instance.Name,
			DatasourceType: instance.Datasource,
			InstanceId:     c.id,
		})
	}
	return
}

// IndexUpdate Data table index operation
func (c *ClickHouse) IndexUpdate(param view.ReqCreateIndex, adds map[string]*db.Index, dels map[string]*db.Index, newList map[string]*db.Index) (err error) {
	// step 1 drop
	for _, del := range dels {
		qs := fmt.Sprintf("ALTER TABLE %s.%s DROP COLUMN IF EXISTS %s;", param.Database, param.Table, del.Field)
		_, err = c.db.Exec(qs)
		if err != nil {
			return err
		}
	}
	// step 2 add
	for _, add := range adds {
		qs := fmt.Sprintf("ALTER TABLE %s.%s ADD COLUMN IF NOT EXISTS %s Nullable(%s);", param.Database, param.Table, add.Field, typORM[add.Typ])
		_, err = c.db.Exec(qs)
		if err != nil {
			return err
		}
	}
	// step 3 rebuild view
	conds := egorm.Conds{}
	conds["iid"] = param.InstanceID
	conds["database"] = param.Database
	conds["name"] = param.Table
	table, err := db.TableInfoX(conds)

	elog.Debug("IndexUpdate", elog.Any("table", table))

	if err != nil {
		return
	}
	// step 3.1 default view
	_, err = c.viewOperator(table.Typ, table.ID, table.Database, table.Name, "", nil, nil, newList, true)
	if err != nil {
		return
	}
	condsViews := egorm.Conds{}
	condsViews["tid"] = table.ID
	viewList, err := db.ViewList(invoker.Db, condsViews)
	elog.Debug("IndexUpdate", elog.Any("viewList", viewList))
	for _, current := range viewList {
		_, err = c.viewOperator(table.Typ, table.ID, table.Database, table.Name, current.Key, current, viewList, newList, true)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *ClickHouse) logsSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT * FROM %s WHERE %s AND "+timeCondition+" ORDER BY "+ignoreKey+" DESC LIMIT %d OFFSET %d",
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET,
		param.PageSize, (param.Page-1)*param.PageSize)
	elog.Debug("ClickHouse", elog.Any("step", "logsSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) countSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count FROM %s WHERE %s AND "+timeCondition,
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET)
	elog.Debug("ClickHouse", elog.Any("step", "countSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) groupBySQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, %s as f FROM %s WHERE %s AND "+timeCondition+" group by %s",
		param.Field,
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET, param.Field)
	elog.Debug("ClickHouse", elog.Any("step", "groupBySQL"), elog.Any("sql", sql))
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
			log.Fatal(err)
		}
		elog.Debug("ClickHouse", elog.Any("fields", fields), elog.Any("values", values))
		for k, _ := range fields {
			elog.Debug("ClickHouse", elog.Any("fields", fields[k]), elog.Any("values", values[k]))
			line[fields[k]] = values[k]
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	return
}
