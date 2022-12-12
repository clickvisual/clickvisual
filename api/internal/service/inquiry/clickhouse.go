package inquiry

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"sort"
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
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builderv2"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

var _ Operator = (*ClickHouse)(nil)

type ClickHouse struct {
	id   int
	mode int
	rs   int // replica status
	db   *sql.DB
}

func NewClickHouse(db *sql.DB, ins *db.BaseInstance) (*ClickHouse, error) {
	if ins.ID == 0 {
		return nil, errors.New("clickhouse add err, id is 0")
	}
	return &ClickHouse{
		db:   db,
		id:   ins.ID,
		mode: ins.Mode,
		rs:   ins.ReplicaStatus,
	}, nil
}

func (c *ClickHouse) Conn() *sql.DB {
	return c.db
}

func (c *ClickHouse) GetMetricsSamples() error {
	_, err := c.GetCreateSQL("metrics", "samples")
	return err
}

func (c *ClickHouse) CreateMetricsSamples(cluster string) error {
	_, _ = c.db.Exec("set allow_deprecated_syntax_for_merge_tree=1")
	switch c.mode {
	case ModeStandalone:
		_, err := c.db.Exec("CREATE DATABASE IF NOT EXISTS metrics;")
		if err != nil {
			return errors.Wrap(err, "create database")
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
		if err != nil {
			return errors.Wrap(err, "create table")
		}
	case ModeCluster:
		_, err := c.db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS metrics ON CLUSTER '%s';", cluster))
		if err != nil {
			return errors.Wrap(err, "create database")
		}
		var mergeTreeSQL string
		switch c.rs {
		case db.ReplicaStatusYes:
			mergeTreeSQL = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS metrics.samples_local ON CLUSTER '%s'
(
  date Date DEFAULT toDate(0),
  name String,
  tags Array(String),
  val Float64,
  ts DateTime,
  updated DateTime DEFAULT now()
)       
ENGINE = ReplicatedMergeTree('/clickhouse/tables/metrics.samples_local/{shard}', '{replica}'  date, (name, tags, ts), 8192, 'graphite_rollup')`, cluster)
		case db.ReplicaStatusNo:
			mergeTreeSQL = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS metrics.samples_local ON CLUSTER '%s'
(
  date Date DEFAULT toDate(0),
  name String,
  tags Array(String),
  val Float64,
  ts DateTime,
  updated DateTime DEFAULT now()
)       
ENGINE = GraphiteMergeTree(date, (name, tags, ts), 8192, 'graphite_rollup')`, cluster)
		}
		_, err = c.db.Exec(mergeTreeSQL)
		if err != nil {
			return errors.Wrap(err, "create mergeTree")
		}
		_, err = c.db.Exec(fmt.Sprintf(`CREATE TABLE if NOT EXISTS metrics.samples ON CLUSTER '%s' AS metrics.samples_local
		ENGINE = Distributed('%s', 'metrics', 'samples_local', sipHash64(name));`, cluster, cluster))
		if err != nil {
			return errors.Wrap(err, "create distributed")
		}
	}
	return nil
}

// SyncView
// delete: list need remove current
// update: list need update current
// create: list need add current
func (c *ClickHouse) SyncView(table db.BaseTable, current *db.BaseView, list []*db.BaseView, isAddOrUpdate bool) (dViewSQL, cViewSQL string, err error) {
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
	elog.Debug("ViewCreate", elog.String("dViewSQL", dViewSQL), elog.String("cViewSQL", cViewSQL))
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
	for _, filter := range res.Filters {
		res.Query = fmt.Sprintf("%s and %s", res.Query, filter)
	}
	var err error
	if isFilter {
		res.Query, err = queryTransformer(res.Query)
	}
	return res, err
}

// CreateTable create default stream data table and view
func (c *ClickHouse) CreateTable(did int, database db.BaseDatabase, ct view.ReqTableCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
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
			TableTyp:                tableTypStr(ct.Typ),
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
		elog.Error("CreateTable", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.viewOperator(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
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
		elog.Debug("CreateTable", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			elog.Error("CreateTable", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	return
}

func (c *ClickHouse) CreateDatabase(name, cluster string) error {

	query := fmt.Sprintf("create database `%s`;", name)
	if c.mode == ModeCluster {
		if cluster == "" {
			return errors.New("cluster is required")
		}
		query = fmt.Sprintf("create database `%s` on cluster `%s`;", name, cluster)
	}
	elog.Error("CreateTable", elog.String("query", query))

	_, err := c.db.Exec(query)
	if err != nil {
		elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("name", name))
		return err
	}
	return nil
}

// GetAlertViewSQL TableTypePrometheusMetric: `CREATE MATERIALIZED VIEW %s TO metrics.samples AS
// SELECT
//
//	    toDate(_timestamp_) as date,
//	    %s as name,
//	    array(%s) as tags,
//	    toFloat64(count(*)) as val,
//	    _timestamp_ as ts,
//	    toDateTime(_timestamp_) as updated
//	FROM %s WHERE %s GROUP by _timestamp_;`,
func (c *ClickHouse) GetAlertViewSQL(alarm *db.Alarm, tableInfo db.BaseTable, filterId int, filter *view.AlarmFilterItem) (string, string, error) {
	if filter.When == "" {
		filter.When = "1=1"
	}
	var (
		viewSQL         string
		viewTableName   string
		sourceTableName string
	)
	viewTableName = alarm.ViewName(tableInfo.Database.Name, tableInfo.Name, filterId)

	tableName := tableInfo.Name
	if c.mode == ModeCluster {
		if tableInfo.CreateType == constx.TableCreateTypeExist {
			createSQL, err := c.GetCreateSQL(tableInfo.Database.Name, tableInfo.Name)
			if err != nil {
				return "", "", err
			}
			tableName, err = getDistributedSubTableName(createSQL)
			if err != nil {
				return "", "", err
			}
		} else {
			tableName = tableInfo.Name + "_local"
		}
	}

	sourceTableName = fmt.Sprintf("`%s`.`%s`", tableInfo.Database.Name, tableName)
	vp := bumo.ParamsView{
		ViewType:     bumo.ViewTypePrometheusMetric,
		ViewTable:    viewTableName,
		CommonFields: TagsToString(alarm, true, filterId),
		SourceTable:  sourceTableName,
		Where:        filter.When,
	}
	if filter.Mode == db.AlarmModeAggregation || filter.Mode == db.AlarmModeAggregationCheck {
		vp.ViewType = bumo.ViewTypePrometheusMetricAggregation
		// vp.WithSQL = adaSelectPart(filter.When)
		vp.WithSQL = filter.When
	}
	viewSQL = c.execView(bumo.Params{
		Cluster:       tableInfo.Database.Cluster,
		ReplicaStatus: c.rs,
		TimeField:     tableInfo.GetTimeField(),
		View:          vp})
	return viewTableName, viewSQL, nil
}

func (c *ClickHouse) CreateAlertView(viewTableName, viewSQL, cluster string) (err error) {
	if viewTableName != "" {
		err = c.DeleteAlertView(viewTableName, cluster)
		if err != nil {
			return
		}
	}
	_, err = c.db.Exec(viewSQL)
	if err != nil {
		return errors.Wrapf(err, "sql: %s", viewSQL)
	}
	return err
}

func (c *ClickHouse) DeleteAlertView(viewTableName, cluster string) (err error) {
	if c.mode == ModeCluster {
		if cluster == "" {
			return errors.Wrapf(constx.ErrClusterNameEmpty, "table %s, cluster %s", viewTableName, cluster)
		}
		_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", viewTableName, cluster))
		if err != nil {
			return errors.Wrapf(err, "table %s, cluster %s", viewTableName, cluster)
		}
		return nil
	}
	_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewTableName))
	if err != nil {
		return errors.Wrapf(err, "table %s", viewTableName)
	}
	return nil
}

// DeleteTable data view stream
func (c *ClickHouse) DeleteTable(database, table, cluster string, tid int) (err error) {
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

func (c *ClickHouse) DeleteDatabase(name string, cluster string) (err error) {
	if cluster == "" {
		_, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s;", name))
	} else {
		_, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s ON CLUSTER '%s';", name, cluster))
	}
	return err
}

func (c *ClickHouse) DoSQL(sql string) (res view.RespComplete, err error) {
	res.Logs = make([]map[string]interface{}, 0)
	tmp, err := c.doQuery(sql)
	if err != nil {
		return
	}
	res.Logs = tmp
	return
}

func (c *ClickHouse) GetLogs(param view.ReqQuery, tid int) (res view.RespQuery, err error) {
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
	res.Logs, err = c.doQuery(execSQL)
	if err != nil {
		return
	}
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

func (c *ClickHouse) Chart(param view.ReqQuery) (res []*view.HighChart, q string, err error) {
	q = c.chartSQL(param)
	charts, err := c.doQuery(q)
	if err != nil {
		elog.Error("Count", elog.Any("sql", q), elog.Any("error", err.Error()))
		return nil, q, err
	}
	res = make([]*view.HighChart, 0)
	for _, chart := range charts {
		row := view.HighChart{}
		if chart["count"] != nil {
			switch chart["count"].(type) {
			case uint64:
				row.Count = chart["count"].(uint64)
			}
		}
		if chart["timeline"] != nil {
			switch chart["timeline"].(type) {
			case time.Time:
				row.From = chart["timeline"].(time.Time).Unix()
			}
		}
		res = append(res, &row)
	}
	return res, q, nil
}

func (c *ClickHouse) Count(param view.ReqQuery) (res uint64, err error) {
	q := c.countSQL(param)
	sqlCountData, err := c.doQuery(q)
	if err != nil {
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
		elog.Error("ClickHouse", elog.Any("sql", c.groupBySQL(param)), elog.FieldErr(err))
		return
	}
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
				elog.Info("GroupBy", elog.Any("type", reflect.TypeOf(v["f"])))
				continue
			}
			res[key] = v["count"].(uint64)
		}
	}
	return
}

func (c *ClickHouse) ListDatabase() ([]*view.RespDatabaseSelfBuilt, error) {
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

func (c *ClickHouse) ListColumn(database, table string, isTimeField bool) (res []*view.RespColumn, err error) {
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

// UpdateIndex Data table index operation
func (c *ClickHouse) UpdateIndex(database db.BaseDatabase, table db.BaseTable, adds map[string]*db.BaseIndex, dels map[string]*db.BaseIndex, newList map[string]*db.BaseIndex) (err error) {
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

func (c *ClickHouse) ListSystemTable() (res []*view.SystemTables) {
	res = make([]*view.SystemTables, 0)
	// s := fmt.Sprintf("select * from system.tables where metadata_modification_time>toDateTime(%d)", time.Now().Add(-time.Minute*10).Unix())
	// Get full data if it is reset mode
	s := "select * from system.tables"
	deps, err := c.doQuery(s)
	if err != nil {
		elog.Error("ListSystemTable", elog.Any("s", s), elog.Any("deps", deps), elog.Any("error", err))
		return
	}
	for _, table := range deps {
		row := view.SystemTables{
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

// CreateStorage create default stream data table and view
func (c *ClickHouse) CreateStorage(did int, database db.BaseDatabase, ct view.ReqStorageCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
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
		elog.Error("CreateTable", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.storageViewOperator(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true, ct)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
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
		elog.Debug("CreateTable", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			elog.Error("CreateTable", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	return
}

// UpdateMergeTreeTable ...
// ALTER TABLE dev.test MODIFY TTL toDateTime(time_second) + toIntervalDay(7)
func (c *ClickHouse) UpdateMergeTreeTable(tableInfo *db.BaseTable, params view.ReqStorageUpdate) (err error) {
	s := fmt.Sprintf("ALTER TABLE %s%s MODIFY TTL toDateTime(_time_second_) + toIntervalDay(%d)",
		genNameWithMode(c.mode, tableInfo.Database.Name, tableInfo.Name),
		genSQLClusterInfo(c.mode, tableInfo.Database.Cluster),
		params.MergeTreeTTL)
	_, err = c.db.Exec(s)
	if err != nil {
		elog.Error("UpdateMergeTreeTable", elog.Any("sql", s), elog.Any("err", err.Error()))
		return
	}
	return
}

// CreateKafkaTable Drop and Create
func (c *ClickHouse) CreateKafkaTable(tableInfo *db.BaseTable, params view.ReqStorageUpdate) (streamSQL string, err error) {
	currentKafkaSQL := tableInfo.SqlStream
	// Drop Table
	dropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s%s",
		genStreamNameWithMode(c.mode, tableInfo.Database.Name, tableInfo.Name),
		genSQLClusterInfo(c.mode, tableInfo.Database.Cluster))
	if _, err = c.db.Exec(dropSQL); err != nil {
		elog.Error("CreateKafkaTable", elog.Any("dropSQL", dropSQL), elog.Any("err", err.Error()))
		return
	}
	// Create Table
	streamParams := bumo.Params{
		TableCreateType: tableInfo.CreateType,
		Stream: bumo.ParamsStream{
			TableName:               genStreamNameWithMode(c.mode, tableInfo.Database.Name, tableInfo.Name),
			TableTyp:                tableTypStr(tableInfo.Typ),
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
	if _, err = c.db.Exec(streamSQL); err != nil {
		elog.Error("CreateKafkaTable", elog.Any("streamSQL", streamSQL), elog.Any("err", err.Error()))
		_, _ = c.db.Exec(currentKafkaSQL)
		return
	}
	return
}

// CreateStorageV3 create default stream data table and view
func (c *ClickHouse) CreateStorageV3(did int, database db.BaseDatabase, ct view.ReqStorageCreateV3) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	dName := genNameWithMode(c.mode, database.Name, ct.TableName)
	dStreamName := genStreamNameWithMode(c.mode, database.Name, ct.TableName)
	// build view statement
	var timeTyp string
	if ct.TimeFieldType == TableTypeString {
		timeTyp = "String"
	} else if ct.TimeFieldType == TableTypeFloat {
		timeTyp = "Float64"
	} else {
		// TODO more check
		timeTyp = "Float64"
	}
	dataParams := bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       ct.TimeField,
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	}
	streamParams := bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       ct.TimeField,
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
		elog.Error("CreateTable", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.storageViewOperatorV3(view.OperatorViewParams{
		Typ:              ct.TimeFieldType,
		Tid:              0,
		Did:              did,
		Table:            ct.TableName,
		CustomTimeField:  "",
		Current:          nil,
		List:             nil,
		Indexes:          nil,
		IsCreate:         true,
		TimeField:        ct.TimeField,
		IsKafkaTimestamp: ct.IsKafkaTimestamp,
	})
	if err != nil {
		elog.Error("CreateTable", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
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
		elog.Debug("CreateTable", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			elog.Error("CreateTable", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	if ct.V3TableType == db.V3TableTypeJaegerJSON {
		_ = c.CreateTraceJaegerDependencies(database.Name, database.Cluster, ct.TableName, ct.Days)
	}
	return
}

func (c *ClickHouse) CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error) {
	// jaegerJson dependencies table
	sc, err := builderv2.GetTableCreator(constx.TableCreateTypeTraceCalculation)
	if err != nil {
		elog.Error("CreateTable", elog.String("step", "GetTableCreator"), elog.FieldErr(err))
		return
	}
	params := builderv2.Params{
		IsShard:   false,
		IsReplica: false,
		Cluster:   cluster,
		Database:  database,
		Table:     table + db.SuffixJaegerJSON,
		TTL:       ttl,
		DB:        c.db,
	}
	if c.mode == ModeCluster {
		params.IsShard = true
		if c.rs == 0 {
			params.IsReplica = true
		}
	}
	sc.SetParams(params)
	_, sqls := sc.GetSQLs()
	if _, err = sc.Execute(sqls); err != nil {
		elog.Error("CreateTable", elog.String("step", "GetDistributedSQL"), elog.FieldErr(err))
		return
	}
	return nil
}

func (c *ClickHouse) DeleteTraceJaegerDependencies(database, cluster, table string) (err error) {
	table = table + db.SuffixJaegerJSON
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
	_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s.%s;", database, table))
	return
}

func (c *ClickHouse) GetTraceGraph(ctx context.Context) (resp []view.RespJaegerDependencyDataModel, err error) {
	dependencies := make([]view.JaegerDependencyDataModel, 0)
	resp = make([]view.RespJaegerDependencyDataModel, 0)
	st := ctx.Value("st")
	et := ctx.Value("et")
	database := ctx.Value("database")
	table := ctx.Value("table")

	querySQL := fmt.Sprintf("select * from `%s`.`%s` where timestamp>%d and timestamp<%d", database.(string), table.(string)+db.SuffixJaegerJSON, st.(int), et.(int))

	elog.Debug("clickHouse", elog.FieldComponent("GetTraceGraph"), elog.FieldName("sql"), elog.String("sql", querySQL))

	res, err := c.db.Query(querySQL)
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("run"), elog.FieldName("query"), elog.FieldErr(err))
		return nil, err
	}
	for res.Next() {
		var timestamp time.Time
		var parent string
		var child string
		var callCount int64
		var serverDurationP50 float64
		var serverDurationP90 float64
		var serverDurationP99 float64
		var clientDurationP50 float64
		var clientDurationP90 float64
		var clientDurationP99 float64
		var serverSuccessRate float64
		var clientSuccessRate float64
		var t time.Time
		if err = res.Scan(&timestamp, &parent, &child, &callCount, &serverDurationP50, &serverDurationP90, &serverDurationP99, &clientDurationP50, &clientDurationP90, &clientDurationP99, &serverSuccessRate, &clientSuccessRate, &t); err != nil {
			elog.Error("workerTrace", elog.FieldComponent("run"), elog.FieldName("scan"), elog.FieldErr(err))
			return
		}
		dependencies = append(dependencies, view.JaegerDependencyDataModel{
			Timestamp:         timestamp,
			Parent:            parent,
			Child:             child,
			CallCount:         callCount,
			ServerDurationP50: serverDurationP50,
			ServerDurationP90: serverDurationP90,
			ServerDurationP99: serverDurationP99,
			ClientDurationP50: clientDurationP50,
			ClientDurationP90: clientDurationP90,
			ClientDurationP99: clientDurationP99,
			ServerSuccessRate: serverSuccessRate,
			ClientSuccessRate: clientSuccessRate,
			Time:              t,
		})
	}
	return transformJaegerDependencies(dependencies), nil
}

func (c *ClickHouse) GetCreateSQL(database, table string) (resp string, err error) {
	querySQL := fmt.Sprintf("SHOW CREATE table `%s`.`%s`;", database, table)
	res, err := c.db.Query(querySQL)
	if err != nil {
		return "", errors.Wrap(err, "db query")
	}
	for res.Next() {
		if err = res.Scan(&resp); err != nil {
			return "", errors.Wrap(err, "row scan")
		}
	}
	return
}

func (c *ClickHouse) ListSystemCluster() (l []*view.SystemClusters, m map[string]*view.SystemClusters, err error) {
	l = make([]*view.SystemClusters, 0)
	m = make(map[string]*view.SystemClusters, 0)
	s := "select * from system.clusters"
	clusters, err := c.doQuery(s)
	if err != nil {
		return nil, nil, errors.WithMessage(err, "doQuery")
	}
	for _, cl := range clusters {
		row := view.SystemClusters{
			ClickhouseSystemClusters: view.ClickhouseSystemClusters{
				Cluster:     cl["cluster"].(string),
				ShardNum:    cl["shard_num"].(uint32),
				ShardWeight: cl["shard_weight"].(uint32),
				ReplicaNum:  cl["replica_num"].(uint32),
			},
		}
		l = append(l, &row)
		m[cl["cluster"].(string)] = &row
	}
	return
}

func (c *ClickHouse) CreateBufferNullDataPipe(req db.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error) {
	// jaegerJson dependencies table
	sc, err := builderv2.GetTableCreator(constx.TableCreateTypeBufferNullDataPipe)
	if err != nil {
		elog.Error("CreateTable", elog.String("step", "CreateBufferNullDataPipe"), elog.FieldErr(err))
		return
	}
	params := builderv2.Params{
		IsShard:   false,
		IsReplica: false,
		Cluster:   req.Cluster,
		Database:  req.Database,
		Table:     req.Table,
		TTL:       req.TTL,
		DB:        c.db,
	}
	if c.mode == ModeCluster {
		params.IsShard = true
		if c.rs == 0 {
			params.IsReplica = true
		}
	}
	sc.SetParams(params)
	names, sqls = sc.GetSQLs()
	if _, err = sc.Execute(sqls); err != nil {
		elog.Error("CreateTable", elog.String("step", "CreateBufferNullDataPipe"), elog.FieldErr(err))
		return
	}
	return
}

func (c *ClickHouse) storageViewOperatorV3(param view.OperatorViewParams) (res string, err error) {
	databaseInfo, err := db.DatabaseInfo(invoker.Db, param.Did)
	if err != nil {
		return
	}
	if c.mode == ModeCluster {
		param.Table += "_local"
	}
	viewName := genViewName(databaseInfo.Name, param.Table, param.CustomTimeField)
	defer func() {
		if err != nil {
			c.viewRollback(param.Tid, param.CustomTimeField)
		}
	}()
	var (
		viewSQL string
	)
	jsonExtractSQL := ""
	if param.Tid != 0 {
		jsonExtractSQL = c.genJsonExtractSQLV3(param.Indexes)
	}
	dName := genName(databaseInfo.Name, param.Table)
	streamName := genStreamName(databaseInfo.Name, param.Table)
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
	if param.CustomTimeField == "" {
		timeConv = c.timeParseSQLV3(param.Typ, nil, param.TimeField)
		whereCond = c.whereConditionSQLDefaultV3(param.List)
	} else {
		if param.Current == nil {
			return "", errors.New("the process processes abnormal data errors, current view cannot be nil")
		}
		timeConv = c.timeParseSQLV3(param.Typ, param.Current, param.TimeField)
		whereCond = c.whereConditionSQLCurrentV3(param.Current)
	}
	viewSQL = c.execView(bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       param.TimeField,
		Cluster:         databaseInfo.Cluster,
		ReplicaStatus:   c.rs,
		View: bumo.ParamsView{
			ViewTable:        viewName,
			TargetTable:      dName,
			TimeConvert:      timeConv,
			CommonFields:     jsonExtractSQL,
			SourceTable:      streamName,
			Where:            whereCond,
			IsKafkaTimestamp: param.IsKafkaTimestamp,
		},
	})
	if param.IsCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouse) genJsonExtractSQLV3(indexes map[string]*db.BaseIndex) string {
	rawLogField := constx.UBWKafkaStreamField
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
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(JSONExtractString(%s, '%s'), '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",\n")
	return jsonExtractSQL
}

func (c *ClickHouse) whereConditionSQLCurrentV3(current *db.BaseView) string {
	rawLogField := constx.UBWKafkaStreamField
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(%s, '%s') = 1", rawLogField, current.Key)
}

func (c *ClickHouse) whereConditionSQLDefaultV3(list []*db.BaseView) string {
	rawLogField := constx.UBWKafkaStreamField
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

func (c *ClickHouse) timeParseSQLV3(typ int, v *db.BaseView, timeField string) string {
	rawLogField := constx.UBWKafkaStreamField
	if timeField == "" {
		timeField = "_time_"
	}
	if v != nil && v.Format == "fromUnixTimestamp64Micro" && v.IsUseDefaultTime == 0 {
		return fmt.Sprintf(nanosecondTimeParse, rawLogField, v.Key, rawLogField, v.Key)
	}
	if typ == TableTypeString {
		return fmt.Sprintf(defaultStringTimeParseV3, rawLogField, timeField, rawLogField, timeField)
	}
	return fmt.Sprintf(defaultFloatTimeParseV3, rawLogField, timeField, rawLogField, timeField)
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
			c.viewRollback(tid, customTimeField)
		}
	}()

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
	viewSQL := c.execView(bumo.Params{
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

func (c *ClickHouse) viewRollback(tid int, key string) {
	tableInfo, err := db.TableInfo(invoker.Db, tid)
	if err != nil {
		elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "doViewRollback"))
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
			elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "doViewRollbackViewInfoX"))
			return
		}
		viewQuery = viewInfo.SqlView
	}
	_, err = c.db.Exec(viewQuery)
	if err != nil {
		elog.Error("viewOperator", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("viewQuery", viewQuery))
		return
	}
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
	elog.Debug("logsTimelineSQL", elog.Any("step", "logsSQL"), elog.Any("sql", sql))
	return
}

func (c *ClickHouse) logsSQL(param view.ReqQuery, tid int) (sql, optSQL, originalWhere string) {
	st := time.Now()
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, _ := db.ViewList(invoker.Db, conds)
	c1 := time.Since(st).Milliseconds()
	orderByField := param.TimeField
	if len(views) > 0 {
		orderByField = db.TimeFieldNanoseconds
	}
	selectFields := genSelectFields(tid)
	c2 := time.Since(st).Milliseconds()
	// Request for the first 100 pages of data
	// optimizing, the idea is to reduce the number of fields involved in operation;
	if param.Page*param.PageSize <= 100 {
		timeFieldEqual := c.timeFieldEqual(param, tid)
		if timeFieldEqual != "" {
			optSQL = fmt.Sprintf("SELECT %s FROM %s WHERE %s %s ORDER BY "+orderByField+" DESC LIMIT %d OFFSET %d",
				selectFields,
				param.DatabaseTable,
				timeFieldEqual,
				c.queryTransform(param, true),
				param.PageSize, (param.Page-1)*param.PageSize)
		}
	}
	c3 := time.Since(st).Milliseconds()
	originalWhere = c.queryTransform(param, false)
	sql = fmt.Sprintf("SELECT %s FROM %s WHERE "+genTimeCondition(param)+" %s ORDER BY "+orderByField+" DESC LIMIT %d OFFSET %d",
		selectFields,
		param.DatabaseTable,
		param.ST, param.ET,
		originalWhere,
		param.PageSize, (param.Page-1)*param.PageSize)
	c4 := time.Since(st).Milliseconds()
	elog.Debug("logsTimelineSQL",
		elog.Any("c1", c1),
		elog.Any("c2", c2),
		elog.Any("c3", c3),
		elog.Any("c4", c4),
	)
	return
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

func (c *ClickHouse) countSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count FROM %s WHERE "+genTimeCondition(param)+" %s",
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true))
	return
}

// SELECT
// count(*),toStartOfFifteenMinutes(_time_second_)
// FROM
// `mogo_shimo_dev`.`otel_dev`
// WHERE
// _time_second_ >= toDateTime(1667273108)
// AND _time_second_ < toDateTime(1667877908)
// GROUP BY
// toStartOfFifteenMinutes(_time_second_)
// ORDER BY
// toStartOfFifteenMinutes(_time_second_)
// DESC
func (c *ClickHouse) chartSQL(param view.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, %s as timeline  FROM %s WHERE "+genTimeCondition(param)+" %s GROUP BY %s ORDER BY %s ASC",
		param.GroupByCond,
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true),
		param.GroupByCond,
		param.GroupByCond)
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

func (c *ClickHouse) timeFieldEqual(param view.ReqQuery, tid int) string {
	var res string
	s := c.logsTimelineSQL(param, tid)
	out, err := c.doQuery(s)
	if err != nil {
		elog.Error("timeFieldEqual", elog.Any("step", "logsSQL"), elog.Any("sql", s), elog.String("error", err.Error()))
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
				elog.Warn("timeFieldEqual", elog.Any("step", "logsSQL"), elog.Any("type", reflect.TypeOf(v[param.TimeField])))
			}
		}
	}
	if res == "" {
		return res
	}
	return "(" + res + ")"
}

func (c *ClickHouse) execView(params bumo.Params) string {
	var obj builder.Builder
	switch c.mode {
	case ModeCluster:
		obj = new(cluster.ViewBuilder)
	default:
		obj = new(standalone.ViewBuilder)
	}
	return builder.Do(obj, params)
}
