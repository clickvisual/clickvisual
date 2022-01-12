package inquiry

import (
	"database/sql"
	"fmt"
	"log"
	"reflect"
	"time"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

const ignoreKey = "_time_"

type ClickHouse struct {
	id             int
	instanceName   string
	datasourceType string
	db             *sql.DB
}

func NewClickHouse(db *sql.DB, id int, instanceName, datasourceType string) *ClickHouse {
	return &ClickHouse{
		db:             db,
		id:             id,
		instanceName:   instanceName,
		datasourceType: datasourceType,
	}
}

func (c *ClickHouse) ID() int {
	return c.id
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
	// 读取索引数据
	instance, _ := db.InstanceByName(param.DatasourceType, param.InstanceName)
	conds := egorm.Conds{}
	conds["instance_id"] = instance.ID
	conds["database"] = param.Database
	conds["table"] = param.Table
	indexes, _ := db.IndexList(conds)
	for _, i := range indexes {
		res.Keys = append(res.Keys, i.Field)
	}
	return
}

func typeof(v interface{}) string {
	return reflect.TypeOf(v).String()
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
			elog.Debug("ClickHouse", elog.Any("sqlCountData2", v["f"]), elog.Any("type", typeof(v["f"])))
			var (
				key string
			)
			switch v["f"].(type) {
			case string:
				key = v["f"].(string)
			case uint16:
				key = fmt.Sprintf("%d", v["f"].(uint16))
			default:
				continue
			}
			res[key] = v["count"].(uint64)

		}
	}
	return
}

func (c *ClickHouse) Tables(database string) (res []string, err error) {
	res = make([]string, 0)
	list, err := c.doQuery(fmt.Sprintf("select table, count(*) as c from system.columns where database = '%s' and name = '%s' and type = 'DateTime' group by table", database, ignoreKey))
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
	list, err := c.doQuery(fmt.Sprintf("select database, count(*) as c from system.columns where name = '%s' and type = 'DateTime' group by database", ignoreKey))
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
			InstanceName:   c.instanceName,
			DatasourceType: c.datasourceType,
			InstanceId:     c.id,
		})
	}
	return
}

func (c *ClickHouse) logsSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT * FROM %s WHERE %s AND _time_ >= %d AND _time_ < %d LIMIT %d OFFSET %d",
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET,
		param.PageSize, (param.Page-1)*param.PageSize)
	elog.Debug("ClickHouse", elog.Any("step", "logsSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) countSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count FROM %s WHERE %s AND _time_ >= %d AND _time_ < %d",
		param.DatabaseTable,
		param.Query,
		param.ST, param.ET)
	elog.Debug("ClickHouse", elog.Any("step", "countSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) groupBySQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, %s as f FROM %s WHERE %s AND _time_ >= %d AND _time_ < %d group by %s",
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
