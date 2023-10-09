package inquiry

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/core/i"
	"github.com/clickvisual/clickvisual/api/core/reader"
	"github.com/clickvisual/clickvisual/api/core/storer"
	"github.com/clickvisual/clickvisual/api/core/switcher"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	constx2 "github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/cluster"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/standalone"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builderv2"
)

var _ Operator = (*ClickHouseX)(nil)

type ClickHouseX struct {
	id int
	db *sql.DB
}

func NewClickHouse(db *sql.DB, ins *db2.BaseInstance) (*ClickHouseX, error) {
	if ins.ID == 0 {
		return nil, errors.New("clickhouse add err, id is 0")
	}
	return &ClickHouseX{
		db: db,
		id: ins.ID,
	}, nil
}

func (c *ClickHouseX) ClusterInfo() (clusters map[string]dto.ClusterInfo, err error) {
	// query databases
	rows, err := c.db.Query("SELECT cluster,shard_num,shard_weight,replica_num,host_name,host_address,port from `system`.`clusters`")
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "query"), elog.FieldErr(err))
		return
	}
	dbClusterList := make([]view2.Cluster, 0)
	for rows.Next() {
		var cluster string
		var shard_num int
		var shard_weight int
		var replica_num int
		var host_name string
		var host_address string
		var port int
		errScan := rows.Scan(&cluster, &shard_num, &shard_weight, &replica_num, &host_name, &host_address, &port)
		if errScan != nil {
			elog.Error("source", elog.FieldErr(err))
			continue
		}
		if strings.HasPrefix(cluster, "test_") {
			continue
		}
		dbClusterList = append(dbClusterList, view2.Cluster{
			Cluster:     cluster,
			ShardNum:    shard_num,
			ReplicaNum:  replica_num,
			HostName:    host_name,
			HostAddress: host_address,
			Port:        port,
		})
	}
	clusters = make(map[string]dto.ClusterInfo, 0)
	for _, dbCluster := range dbClusterList {
		clusterInfo, ok := clusters[dbCluster.Cluster]
		if !ok {
			clusterInfo = dto.ClusterInfo{
				Name:          dbCluster.Cluster,
				MaxShardNum:   0,
				MaxReplicaNum: 0,
				Hosts:         make([]dto.ClusterInfoHost, 0),
			}
		}
		if clusterInfo.MaxReplicaNum < dbCluster.ReplicaNum {
			clusterInfo.MaxReplicaNum = dbCluster.ReplicaNum
		}
		if clusterInfo.MaxShardNum < dbCluster.ShardNum {
			clusterInfo.MaxShardNum = dbCluster.ShardNum
		}
		clusters[dbCluster.Cluster] = clusterInfo
	}
	return
}

// IsReplica status 0 has replica 1 no replica
func (c *ClickHouseX) isReplica(cluster string) bool {
	clusters, err := c.ClusterInfo()
	if err != nil {
		elog.Error("cluster info get failed", l.E(err))
		return false
	}
	if clu, ok := clusters[cluster]; ok {
		if clu.MaxReplicaNum > 1 {
			return true
		}
	}
	return false
}

// IsShard status 1 has shard 0 no shard
func (c *ClickHouseX) isShard(cluster string) bool {
	clusters, err := c.ClusterInfo()
	if err != nil {
		elog.Error("cluster info get failed", l.E(err))
		return false
	}
	if clu, ok := clusters[cluster]; ok {
		if clu.MaxShardNum > 1 {
			return true
		}
	}
	return false
}

func (c *ClickHouseX) isCluster(cluster string) (int, error) {
	if c.isShard(cluster) {
		return 1, nil
	}
	if c.isReplica(cluster) {
		return 1, nil
	}
	return 0, nil
}

func (c *ClickHouseX) Conn() *sql.DB {
	return c.db
}

func (c *ClickHouseX) GetMetricsSamples() error {
	_, err := c.GetCreateSQL("metrics", "samples")
	return err
}

func (c *ClickHouseX) Version() (ver string, err error) {
	res, err := c.db.Query("select version() as ver")
	if err != nil {
		return "", errors.Wrap(err, "db query")
	}
	for res.Next() {
		if err = res.Scan(&ver); err != nil {
			return "", errors.Wrap(err, "row scan")
		}
	}
	return
}

func clickhouseVersionCompare(current, stand string) int {
	ca := strings.Split(current, ".")
	sa := strings.Split(stand, ".")
	minLen := len(ca)
	if len(sa) < len(ca) {
		minLen = len(sa)
	}
	for i := 0; i < minLen; i++ {
		a, _ := strconv.Atoi(ca[i])
		b, _ := strconv.Atoi(sa[i])
		fmt.Println(b)
		if a > b {
			return +1
		} else if a < b {
			return -1
		}
	}
	return 0
}

func (c *ClickHouseX) CreateMetricsSamples(cluster string) error {
	ver, err := c.Version()
	if err != nil {
		return err
	}
	if clickhouseVersionCompare(ver, "22.3.7") == 1 {
		return c.createMetricsSamplesV2(cluster)
	}
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	switch isCluster {
	case ModeStandalone:
		_, err = c.db.Exec("CREATE DATABASE IF NOT EXISTS metrics;")
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
		_, err = c.db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS metrics ON CLUSTER '%s';", cluster))
		if err != nil {
			return errors.Wrap(err, "create database")
		}
		var mergeTreeSQL string
		if c.isReplica(cluster) {
			mergeTreeSQL = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS metrics.samples_local ON CLUSTER '%s'
		(
		  date Date DEFAULT toDate(0),
		  name String,
		  tags Array(String),
		  val Float64,
		  ts DateTime,
		  updated DateTime DEFAULT now()
		)
		ENGINE = ReplicatedMergeTree('/clickhouse/tables/metrics.samples_local/{shard}', '{replica}', date, (name, tags, ts), 8192, 'graphite_rollup')`, cluster)
		} else {
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

// CreateMetricsSamplesV2
// Change tags type Array(String) to Array(FixedString)
// Support clickhouse v22.3.7+
func (c *ClickHouseX) createMetricsSamplesV2(cluster string) error {
	_, _ = c.db.Exec("set allow_deprecated_syntax_for_merge_tree=1")
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	switch isCluster {
	case ModeStandalone:
		_, err := c.db.Exec("CREATE DATABASE IF NOT EXISTS metrics;")
		if err != nil {
			return errors.Wrap(err, "create database")
		}
		_, err = c.db.Exec(`CREATE TABLE IF NOT EXISTS metrics.samples
(
    date Date DEFAULT toDate(0),
    name String,
    tags Array(FixedString(64)),
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
		// 		switch c.replicaStatus {
		// 		case db.ReplicaStatusYes:
		// 			mergeTreeSQL = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS metrics.samples_local ON CLUSTER '%s'
		// (
		//   date Date DEFAULT toDate(0),
		//   name String,
		//   tags Array(FixedString(64)),
		//   val Float64,
		//   ts DateTime,
		//   updated DateTime DEFAULT now()
		// )
		// SETTINGS index_granularity=8192;
		// ENGINE = ReplicatedMergeTree('/clickhouse/tables/metrics.samples_local/{shard}', '{replica}', date, (name, tags, ts), 8192, 'graphite_rollup')`, cluster)
		// 		case db.ReplicaStatusNo:
		mergeTreeSQL = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS metrics.samples_local ON CLUSTER '%s'
(
  date Date DEFAULT toDate(0),
  name String,
  tags Array(FixedString(64)),
  val Float64,
  ts DateTime,
  updated DateTime DEFAULT now()
)
ENGINE = GraphiteMergeTree(date, (name, tags, ts), 8192, 'graphite_rollup')`, cluster)
		// }
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
func (c *ClickHouseX) SyncView(table db2.BaseTable, current *db2.BaseView, list []*db2.BaseView, isAddOrUpdate bool) (dViewSQL, cViewSQL string, err error) {
	// build view statement
	conds := egorm.Conds{}
	conds["tid"] = table.ID
	conds["kind"] = db2.IndexKindLog
	indexes, err := db2.IndexList(conds)
	if err != nil {
		return
	}
	indexMap := make(map[string]*db2.BaseIndex)
	for _, i := range indexes {
		indexMap[i.Field] = i
	}
	dViewSQL, err = c.updateSwitcher(table.TimeFieldKind, table.ID, table.Did, table.Name, "", current, list, indexMap, isAddOrUpdate)
	if err != nil {
		return
	}
	cViewSQL, err = c.updateSwitcher(table.TimeFieldKind, table.ID, table.Did, table.Name, current.Key, current, list, indexMap, isAddOrUpdate)
	return
}

func (c *ClickHouseX) Prepare(res view2.ReqQuery, isRegroup bool) (view2.ReqQuery, error) {
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
		return res, constx2.ErrQueryIntervalLimit
	}
	if interval <= 0 {
		res.ST = time.Now().Add(-time.Minute * 15).Unix()
		res.ET = time.Now().Unix()
	}
	for _, filter := range res.Filters {
		res.Query = fmt.Sprintf("%s and %s", res.Query, filter)
	}
	var err error
	if isRegroup {
		res.Query, err = queryTransformer(res.Query)
	}
	return res, err
}

// CreateTable create default stream data table and view
func (c *ClickHouseX) CreateTable(did int, database db2.BaseDatabase, ct view2.ReqTableCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	isCluster, err := c.isCluster(database.Cluster)
	if err != nil {
		return
	}
	dName := genNameWithMode(isCluster, database.Name, ct.TableName)
	dStreamName := genStreamNameWithMode(isCluster, database.Name, ct.TableName)
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

	if isCluster == ModeCluster {
		dataParams.Cluster = database.Cluster
		streamParams.Cluster = database.Cluster
		if c.isReplica(database.Cluster) {
			dataParams.ReplicaStatus = db2.ReplicaStatusYes
			streamParams.ReplicaStatus = db2.ReplicaStatusYes
		} else {
			dataParams.ReplicaStatus = db2.ReplicaStatusNo
			streamParams.ReplicaStatus = db2.ReplicaStatusNo
		}
		dDataSQL = builder.Do(new(cluster.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
	} else {
		dDataSQL = builder.Do(new(standalone.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
	}
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("isCluster", isCluster), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("isCluster", isCluster), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.updateSwitcher(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
		return
	}
	if isCluster == ModeCluster {
		rs := db2.ReplicaStatusNo
		if c.isReplica(database.Cluster) {
			rs = db2.ReplicaStatusYes
		}
		p := bumo.Params{
			Cluster:       database.Cluster,
			ReplicaStatus: rs,
			Data: bumo.ParamsData{
				DataType:    bumo.DataTypeDistributed,
				TableName:   genName(database.Name, ct.TableName),
				SourceTable: dName,
			},
		}
		if c.isReplica(database.Cluster) {
			p.ReplicaStatus = db2.ReplicaStatusYes
		} else {
			p.ReplicaStatus = db2.ReplicaStatusNo
		}
		dDistributedSQL = builder.Do(new(cluster.DataBuilder), p)
		elog.Debug("CreateTable", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			elog.Error("CreateTable", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	return
}

func (c *ClickHouseX) CreateDatabase(name, cluster string) error {
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster error")
	}
	if isCluster == ModeCluster {
		if cluster == "" {
			return errors.New("cluster is required")
		}
		_, err = c.db.Exec(fmt.Sprintf("CREATE DATABASE `%s` ON CLUSTER '%s'", name, cluster))
	} else {
		_, err = c.db.Exec(fmt.Sprintf("CREATE DATABASE `%s`", name))
	}
	if err != nil {
		elog.Error("updateSwitcher", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("name", name))
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
func (c *ClickHouseX) GetAlertViewSQL(alarm *db2.Alarm, tableInfo db2.BaseTable, filterId int, filter *view2.AlarmFilterItem) (string, string, error) {
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
	isCluster, err := c.isCluster(tableInfo.Database.Cluster)
	if err != nil {
		return "", "", errors.Wrap(err, "isCluster get failed")
	}
	if isCluster == ModeCluster {
		if tableInfo.CreateType == constx2.TableCreateTypeExist {
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
	if filter.Mode == db2.AlarmModeAggregation || filter.Mode == db2.AlarmModeAggregationCheck {
		vp.ViewType = bumo.ViewTypePrometheusMetricAggregation
		// vp.WithSQL = adaSelectPart(filter.When)
		vp.WithSQL = filter.When
	}
	rs := db2.ReplicaStatusNo
	if c.isReplica(tableInfo.Database.Cluster) {
		rs = db2.ReplicaStatusYes
	}
	viewSQL, err = c.execView(bumo.Params{
		Cluster:       tableInfo.Database.Cluster,
		ReplicaStatus: rs,
		TimeField:     tableInfo.GetTimeField(),
		View:          vp})
	if err != nil {
		return "", "", err
	}
	return viewTableName, viewSQL, nil
}

func (c *ClickHouseX) CreateAlertView(viewTableName, viewSQL, cluster string) (err error) {
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

func (c *ClickHouseX) DeleteAlertView(viewTableName, cluster string) (err error) {
	if viewTableName == "" {
		return nil
	}
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	if isCluster == ModeCluster {
		if cluster == "" {
			return errors.Wrapf(constx2.ErrClusterNameEmpty, "table %s, cluster %s", viewTableName, cluster)
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

// DeleteTableListByNames data view stream
func (c *ClickHouseX) DeleteTableListByNames(names []string, cluster string) (err error) {
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	for _, name := range names {
		nameWithCluster := name
		if isCluster == ModeCluster {
			if cluster == "" {
				err = constx2.ErrClusterNameEmpty
				return
			}
			nameWithCluster = fmt.Sprintf("%s ON CLUSTER '%s'", name, cluster)
		}
		_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s;", nameWithCluster))
		if err != nil {
			return err
		}
	}
	return nil
}

// DeleteTable data view stream
func (c *ClickHouseX) DeleteTable(database, table, cluster string, tid int) (err error) {
	var views []*db2.BaseView
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	if isCluster == ModeCluster {
		if cluster == "" {
			err = constx2.ErrClusterNameEmpty
			return
		}
		_, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS `%s`.`%s` ON CLUSTER '%s';", database, table, cluster))
		if err != nil {
			return err
		}
		table = table + "_local"
	}

	conds := egorm.Conds{}
	conds["tid"] = tid
	views, err = db2.ViewList(invoker.Db, conds)
	if err != nil {
		return err
	}
	delViewSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", genViewName(database, table, ""))
	delStreamSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", genStreamName(database, table))
	delDataSQL := fmt.Sprintf("DROP TABLE IF EXISTS `%s`.`%s`;", database, table)
	if isCluster == ModeCluster {
		delViewSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", genViewName(database, table, ""), cluster)
		delStreamSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s';", genStreamName(database, table), cluster)
		delDataSQL = fmt.Sprintf("DROP TABLE IF EXISTS `%s`.`%s` ON CLUSTER '%s';", database, table, cluster)
	}
	_, err = c.db.Exec(delViewSQL)
	if err != nil {
		return err
	}
	// query all view
	for _, v := range views {
		userViewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", genViewName(database, table, v.Key))
		if isCluster == ModeCluster {
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

func (c *ClickHouseX) DeleteDatabase(name string, cluster string) (err error) {
	if cluster == "" {
		_, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s;", name))
	} else {
		_, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s ON CLUSTER '%s';", name, cluster))
	}
	return err
}

func (c *ClickHouseX) DoSQL(sql string) (res view2.RespComplete, err error) {
	res.Logs = make([]map[string]interface{}, 0)
	tmp, err := c.doQuery(sql, true)
	if err != nil {
		return
	}
	res.Logs = tmp
	return
}

func (c *ClickHouseX) GetLogs(param view2.ReqQuery, tid int) (res view2.RespQuery, err error) {
	res.Logs = make([]map[string]interface{}, 0)
	res.Keys = make([]*db2.BaseIndex, 0)
	res.Terms = make([][]string, 0)
	var (
		defaultSQL    string
		originalWhere string
		optimizeSQL   string
	)
	switch param.AlarmMode {
	case db2.AlarmModeAggregation:
		defaultSQL = param.Query
	case db2.AlarmModeAggregationCheck:
		defaultSQL = alarmAggregationSQLWith(param)
	default:
		defaultSQL, optimizeSQL, originalWhere = c.logsSQL(param, tid)
	}
	var execSQL = defaultSQL
	if optimizeSQL != "" {
		execSQL = optimizeSQL
	}
	res.Logs, err = c.doQuery(execSQL, false)
	if err != nil {
		return
	}
	// try again
	res.Query = defaultSQL
	res.Where = strings.TrimSuffix(strings.TrimPrefix(originalWhere, "AND ("), ")")
	for k := range res.Logs {
		if param.TimeField != db2.TimeFieldSecond {
			if param.TimeFieldType == db2.TimeFieldTypeTsMs {
				if _, ok := res.Logs[k][db2.TimeFieldSecond]; !ok {
					res.Logs[k][db2.TimeFieldSecond] = res.Logs[k][param.TimeField].(int64) / 1000
					res.Logs[k][db2.TimeFieldNanoseconds] = res.Logs[k][param.TimeField].(int64)
				}
			} else if param.TimeFieldType == db2.TimeFieldTypeDT3 {
				res.Logs[k][db2.TimeFieldNanoseconds] = res.Logs[k][param.TimeField]
			} else {
				res.Logs[k][db2.TimeFieldSecond] = res.Logs[k][param.TimeField]
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
	res.Keys, _ = db2.IndexList(conds)
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

func (c *ClickHouseX) Chart(param view2.ReqQuery) (res []*view2.HighChart, q string, err error) {
	q = c.chartSQL(param)
	charts, err := c.doQuery(q, false)
	if err != nil {
		elog.Error("Count", elog.Any("sql", q), elog.Any("error", err.Error()))
		return nil, q, err
	}
	res = make([]*view2.HighChart, 0, len(charts))
	for _, chart := range charts {
		row := view2.HighChart{}
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

func (c *ClickHouseX) Count(param view2.ReqQuery) (res uint64, err error) {
	q := c.countSQL(param)
	sqlCountData, err := c.doQuery(q, false)
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

func (c *ClickHouseX) GroupBy(param view2.ReqQuery) (res map[string]uint64) {
	res = make(map[string]uint64, 0)
	sqlCountData, err := c.doQuery(c.groupBySQL(param), false)
	if err != nil {
		elog.Error("ClickHouseX", elog.Any("sql", c.groupBySQL(param)), elog.FieldErr(err))
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
			case int16:
				key = fmt.Sprintf("%d", v["f"].(int16))
			case *int16:
				key = fmt.Sprintf("%d", v["f"].(*int16))
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
			if key == "" {
				continue
			}
			res[key] = v["count"].(uint64)
		}
	}
	return
}

func (c *ClickHouseX) databases() map[string][]*view2.RespTablesSelfBuilt {
	res := make(map[string][]*view2.RespTablesSelfBuilt)
	query := "select name from system.databases"
	list, err := c.doQuery(query, false)
	if err != nil {
		return res
	}
	for _, row := range list {
		t := row["name"].(string)
		res[t] = make([]*view2.RespTablesSelfBuilt, 0)
	}
	return res
}

func (c *ClickHouseX) ListDatabase() ([]*view2.RespDatabaseSelfBuilt, error) {
	databases := make([]*view2.RespDatabaseSelfBuilt, 0)
	dm := c.databases()
	// 先从 system.databases 获取所有的数据库
	query := "select database, name from system.tables"
	list, err := c.doQuery(query, false)
	if err != nil {
		return nil, err
	}
	for _, row := range list {
		d := row["database"].(string)
		t := row["name"].(string)
		if _, ok := dm[d]; !ok {
			dm[d] = make([]*view2.RespTablesSelfBuilt, 0)
		}
		dm[d] = append(dm[d], &view2.RespTablesSelfBuilt{
			Name: t,
		})
	}
	for databaseName, tables := range dm {
		databases = append(databases, &view2.RespDatabaseSelfBuilt{
			Name:   databaseName,
			Tables: tables,
		})
	}
	return databases, nil
}

func (c *ClickHouseX) ListColumn(database, table string, isTimeField bool) (res []*view2.RespColumn, err error) {
	res = make([]*view2.RespColumn, 0)
	var query string
	if isTimeField {
		query = fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s' and (`type` like %s or `type` like %s)",
			database, table, "'%Int%'", "'%DateTime%'")
	} else {
		query = fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s'", database, table)
	}
	list, err := c.doQuery(query, false)
	if err != nil {
		return
	}
	for _, row := range list {
		typeDesc := row["type"].(string)
		res = append(res, &view2.RespColumn{
			Name:     row["name"].(string),
			TypeDesc: typeDesc,
			Type:     fieldTypeJudgment(typeDesc),
		})
	}
	return
}

// UpdateLogAnalysisFields Data table index operation
func (c *ClickHouseX) UpdateLogAnalysisFields(database db2.BaseDatabase, table db2.BaseTable, adds map[string]*db2.BaseIndex, dels map[string]*db2.BaseIndex, newList map[string]*db2.BaseIndex) (err error) {
	// step 1 drop
	alertSQL := ""
	isCluster, err := c.isCluster(database.Cluster)
	if err != nil {
		return
	}
	for _, del := range dels {
		if isCluster == ModeCluster {
			if del.HashTyp == db2.HashTypeSip || del.HashTyp == db2.HashTypeURL {
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
			if del.HashTyp == db2.HashTypeSip || del.HashTyp == db2.HashTypeURL {
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
		if isCluster == ModeCluster {
			if add.HashTyp == db2.HashTypeSip || add.HashTyp == db2.HashTypeURL {
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
			if add.HashTyp == db2.HashTypeSip || add.HashTyp == db2.HashTypeURL {
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
	defaultViewSQL, err := c.updateSwitcher(table.TimeFieldKind, table.ID, database.ID, table.Name, "", nil, nil, newList, true)
	if err != nil {
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["sql_view"] = defaultViewSQL
	if alertSQL != "" {
		ups["sql_data"] = fmt.Sprintf("%s\n%s", table.SqlData, alertSQL)
	}
	err = db2.TableUpdate(tx, table.ID, ups)
	if err != nil {
		tx.Rollback()
		return err
	}
	// 更新自定义时间轴字段数据
	condsViews := egorm.Conds{}
	condsViews["tid"] = table.ID
	viewList, err := db2.ViewList(invoker.Db, condsViews)
	if err != nil {
		tx.Rollback()
		return err
	}
	for _, current := range viewList {
		innerViewSQL, errViewOperator := c.updateSwitcher(table.TimeFieldKind, table.ID, database.ID, table.Name, current.Key, current, viewList, newList, true)
		if errViewOperator != nil {
			tx.Rollback()
			return errViewOperator
		}
		upsView := make(map[string]interface{}, 0)
		upsView["sql_view"] = innerViewSQL
		errViewUpdate := db2.ViewUpdate(tx, current.ID, upsView)
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

func (c *ClickHouseX) ListSystemTable() (res []*view2.SystemTables) {
	res = make([]*view2.SystemTables, 0)
	// s := fmt.Sprintf("select * from system.tables where metadata_modification_time>toDateTime(%d)", time.Now().Add(-time.Minute*10).Unix())
	// Get full data if it is reset isCluster
	s := "select * from system.tables"
	deps, err := c.doQuery(s, false)
	if err != nil {
		elog.Error("ListSystemTable", elog.Any("s", s), elog.Any("deps", deps), elog.Any("error", err))
		return
	}
	for _, table := range deps {
		row := view2.SystemTables{
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

func (c *ClickHouseX) CreateStorageJSONAsString(database db2.BaseDatabase, ct view2.ReqStorageCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	// 采用 core 的新流程
	// 创建 storer -> reader -> switcher
	var storeSQLs []string
	var readerSQLs []string
	var switcherSQLs []string
	// storer
	_, storeSQLs, err = storer.New(db2.DatasourceClickHouse, i.StorerParams{
		CreateType: ct.CreateType,
		IsShard:    c.isShard(database.Cluster),
		IsReplica:  c.isReplica(database.Cluster),
		Cluster:    database.Cluster,
		Database:   database.Name,
		Table:      ct.TableName,
		Conn:       c.Conn(),
		Fields:     ct.Mapping2String(true, ct.RawLogFieldParent),
		TTL:        ct.Days,
	}).Create()
	if err != nil {
		return
	}
	// reader
	_, readerSQLs, err = reader.New(db2.DatasourceClickHouse, i.ReaderParams{
		CreateType:              ct.CreateType,
		IsShard:                 c.isShard(database.Cluster),
		IsReplica:               c.isReplica(database.Cluster),
		Cluster:                 database.Cluster,
		Database:                database.Name,
		Table:                   ct.TableName,
		Conn:                    c.Conn(),
		Brokers:                 ct.Brokers,
		Topics:                  ct.Topics,
		GroupName:               database.Name + "_" + ct.TableName,
		KafkaNumConsumers:       ct.Consumers,
		KafkaSkipBrokenMessages: ct.KafkaSkipBrokenMessages,
	}).Create()
	if err != nil {
		return
	}
	// switcher
	_, switcherSQLs, err = switcher.New(db2.DatasourceClickHouse, i.SwitcherParams{
		CreateType:          ct.CreateType,
		IsShard:             c.isShard(database.Cluster),
		IsReplica:           c.isReplica(database.Cluster),
		Cluster:             database.Cluster,
		Database:            database.Name,
		Table:               ct.TableName,
		Conn:                c.Conn(),
		RawLogField:         ct.RawLogField,
		RawLogFieldParent:   ct.RawLogFieldParent,
		ParseIndexes:        c.jsonExtractSQL(nil, ct.GetRawLogField()),
		ParseFields:         ct.Mapping2Fields(ct.RawLogFieldParent),
		ParseTime:           c.timeParseJSONAsString(ct.Typ, nil, ct.TimeField, ct.TimeFieldParent, ct.GetRawLogField()),
		ParseWhere:          c.whereConditionSQLDefault(nil, ct.GetRawLogField()),
		IsRawLogFieldString: ct.IsRawLogFieldString(),
	}).Create()
	if err != nil {
		return
	}
	dDataSQL = storeSQLs[0]
	if len(storeSQLs[0]) == 2 {
		dDistributedSQL = storeSQLs[1]
	}
	dStreamSQL = readerSQLs[0]
	dViewSQL = switcherSQLs[0]
	return
}

// CreateStorage create default stream data table and view
func (c *ClickHouseX) CreateStorage(did int, database db2.BaseDatabase, ct view2.ReqStorageCreate) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	isCluster, err := c.isCluster(database.Cluster)
	if err != nil {
		return
	}
	dName := genNameWithMode(isCluster, database.Name, ct.TableName)
	dStreamName := genStreamNameWithMode(isCluster, database.Name, ct.TableName)
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
		KafkaJsonMapping: ct.Mapping2String(true, ""),
		LogField:         ct.RawLogField,
		TimeField:        ct.TimeField,
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	}
	streamParams := bumo.Params{
		KafkaJsonMapping: ct.Mapping2String(true, ""),
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
	if isCluster == ModeCluster {
		dataParams.Cluster = database.Cluster
		streamParams.Cluster = database.Cluster
		if c.isReplica(database.Cluster) {
			streamParams.ReplicaStatus = db2.ReplicaStatusYes
			dataParams.ReplicaStatus = db2.ReplicaStatusYes
		} else {
			streamParams.ReplicaStatus = db2.ReplicaStatusNo
			dataParams.ReplicaStatus = db2.ReplicaStatusNo
		}
		dDataSQL = builder.Do(new(cluster.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
	} else {
		dDataSQL = builder.Do(new(standalone.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
	}
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("isCluster", isCluster), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("isCluster", isCluster), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.updateSwitcherJSONEachRow(ct.Typ, 0, did, ct.TableName, "", nil, nil, nil, true, ct)
	if err != nil {
		elog.Error("CreateTable", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
		return
	}
	if isCluster == ModeCluster {
		p := bumo.Params{
			Cluster: database.Cluster,
			Data: bumo.ParamsData{
				DataType:    bumo.DataTypeDistributed,
				TableName:   genName(database.Name, ct.TableName),
				SourceTable: dName,
			},
		}
		if c.isReplica(database.Cluster) {
			p.ReplicaStatus = db2.ReplicaStatusYes
		} else {
			p.ReplicaStatus = db2.ReplicaStatusNo
		}
		dDistributedSQL = builder.Do(new(cluster.DataBuilder), p)
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
func (c *ClickHouseX) UpdateMergeTreeTable(tableInfo *db2.BaseTable, params view2.ReqStorageUpdate) (err error) {
	isCluster, err := c.isCluster(tableInfo.Database.Cluster)
	if err != nil {
		return errors.Wrap(err, "get isCluster error")
	}
	s := fmt.Sprintf("ALTER TABLE %s%s MODIFY TTL toDateTime(_time_second_) + toIntervalDay(%d)",
		genNameWithMode(isCluster, tableInfo.Database.Name, tableInfo.Name),
		genSQLClusterInfo(isCluster, tableInfo.Database.Cluster),
		params.MergeTreeTTL)
	_, err = c.db.Exec(s)
	if err != nil {
		elog.Error("UpdateMergeTreeTable", elog.Any("sql", s), elog.Any("err", err.Error()))
		return
	}
	return
}

// CreateKafkaTable Drop and Create
func (c *ClickHouseX) CreateKafkaTable(tableInfo *db2.BaseTable, params view2.ReqStorageUpdate) (streamSQL string, err error) {
	currentKafkaSQL := tableInfo.SqlStream
	// Drop TableName
	isCluster, err := c.isCluster(tableInfo.Database.Cluster)
	if err != nil {
		return "", errors.Wrap(err, "isCluster error")
	}
	dropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s%s", genStreamNameWithMode(isCluster, tableInfo.Database.Name, tableInfo.Name), genSQLClusterInfo(isCluster, tableInfo.Database.Cluster))
	if _, err = c.db.Exec(dropSQL); err != nil {
		elog.Error("CreateKafkaTable", elog.Any("dropSQL", dropSQL), elog.Any("err", err.Error()))
		return
	}

	if tableInfo.CreateType == constx2.TableCreateTypeJSONAsString {
		streamSQL, err = c.updateReaderJSONAsString(tableInfo, params)
		return
	} else {
		// Create TableName
		streamParams := bumo.Params{
			TableCreateType: tableInfo.CreateType,
			Stream: bumo.ParamsStream{
				TableName:               genStreamNameWithMode(isCluster, tableInfo.Database.Name, tableInfo.Name),
				TableTyp:                tableTypStr(tableInfo.TimeFieldKind),
				Group:                   tableInfo.Database.Name + "_" + tableInfo.Name,
				Brokers:                 params.KafkaBrokers,
				Topic:                   params.KafkaTopic,
				ConsumerNum:             params.KafkaConsumerNum,
				KafkaSkipBrokenMessages: params.KafkaSkipBrokenMessages,
			},
		}
		// 兼容旧版本
		if tableInfo.TimeField != "" {
			streamParams.TimeField = tableInfo.TimeField
		}
		if tableInfo.RawLogField != "" {
			streamParams.LogField = tableInfo.RawLogField
		}
		// 新版本数据填充
		if tableInfo.AnyJSON != "" {
			rsc := view2.ReqStorageCreateUnmarshal(tableInfo.AnyJSON)
			streamParams.KafkaJsonMapping = rsc.Mapping2String(true, "")
			if rsc.TimeField != "" {
				streamParams.TimeField = rsc.TimeField
			}
			if rsc.RawLogField != "" {
				streamParams.LogField = rsc.RawLogField
			}
		}

		if isCluster == ModeCluster {
			streamParams.Cluster = tableInfo.Database.Cluster
			if c.isReplica(tableInfo.Database.Cluster) {
				streamParams.ReplicaStatus = db2.ReplicaStatusYes
			} else {
				streamParams.ReplicaStatus = db2.ReplicaStatusNo
			}
			streamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
		} else {
			streamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
		}
		_, err = c.db.Exec(streamSQL)
	}

	if err != nil {
		elog.Error("CreateKafkaTable", elog.Any("streamSQL", streamSQL), elog.Any("err", err.Error()))
		_, _ = c.db.Exec(currentKafkaSQL)
		return
	}
	return
}

func (c *ClickHouseX) CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error) {
	// jaegerJson dependencies table
	sc, err := builderv2.GetTableCreator(constx2.TableCreateTypeTraceCalculation)
	if err != nil {
		elog.Error("CreateTable", elog.String("step", "GetTableCreator"), elog.FieldErr(err))
		return
	}
	params := builderv2.Params{
		IsShard:   false,
		IsReplica: false,
		Cluster:   cluster,
		Database:  database,
		Table:     table + db2.SuffixJaegerJSON,
		TTL:       ttl,
		DB:        c.db,
	}
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	if isCluster == ModeCluster {
		params.IsShard = true
		if c.isReplica(cluster) {
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

func (c *ClickHouseX) DeleteTraceJaegerDependencies(database, cluster, table string) (err error) {
	table = table + db2.SuffixJaegerJSON
	isCluster, err := c.isCluster(cluster)
	if err != nil {
		return errors.Wrap(err, "isCluster get failed")
	}
	if isCluster == ModeCluster {
		if cluster == "" {
			err = constx2.ErrClusterNameEmpty
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

func (c *ClickHouseX) GetTraceGraph(ctx context.Context) (resp []view2.RespJaegerDependencyDataModel, err error) {
	dependencies := make([]view2.JaegerDependencyDataModel, 0)
	resp = make([]view2.RespJaegerDependencyDataModel, 0)
	st := ctx.Value("st")
	et := ctx.Value("et")
	database := ctx.Value("database")
	table := ctx.Value("table")

	querySQL := fmt.Sprintf("select * from `%s`.`%s` where timestamp>%d and timestamp<%d", database.(string), table.(string)+db2.SuffixJaegerJSON, st.(int), et.(int))

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
		dependencies = append(dependencies, view2.JaegerDependencyDataModel{
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

func (c *ClickHouseX) GetCreateSQL(database, table string) (resp string, err error) {
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

func (c *ClickHouseX) ListSystemCluster() (l []*view2.SystemClusters, m map[string]*view2.SystemClusters, err error) {
	l = make([]*view2.SystemClusters, 0)
	m = make(map[string]*view2.SystemClusters, 0)
	s := "select * from system.clusters"
	clusters, err := c.doQuery(s, false)
	if err != nil {
		return nil, nil, errors.WithMessage(err, "doQuery")
	}
	for _, cl := range clusters {
		row := view2.SystemClusters{
			ClickhouseSystemClusters: view2.ClickhouseSystemClusters{
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

func (c *ClickHouseX) CreateBufferNullDataPipe(req db2.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error) {
	// // jaegerJson dependencies table
	// sc, err := builderv2.GetTableCreator(constx.TableCreateTypeBufferNullDataPipe)
	// if err != nil {
	// 	elog.Error("CreateTable", elog.String("step", "CreateBufferNullDataPipe"), elog.FieldErr(err))
	// 	return
	// }
	// params := builderv2.Params{
	// 	IsShard:   false,
	// 	IsReplica: false,
	// 	Cluster:   req.Cluster,
	// 	Database:  req.Database,
	// 	Table:     req.Table,
	// 	TTL:       req.TTL,
	// 	DB:        c.db,
	// }
	// if c.isCluster == ModeCluster {
	// 	params.IsShard = true
	// 	if c.replicaStatus == 0 {
	// 		params.IsReplica = true
	// 	}
	// }
	// sc.SetParams(params)
	// names, sqls = sc.GetSQLs()
	// if _, err = sc.Execute(sqls); err != nil {
	// 	elog.Error("CreateTable", elog.String("step", "CreateBufferNullDataPipe"), elog.FieldErr(err))
	// 	return
	// }
	return
}

// MergeTreeTTL
// KafkaBrokers
// KafkaTopic
// KafkaConsumerNum
// KafkaSkipBrokenMessages
// Desc
// V3TableType
func (c *ClickHouseX) updateReaderJSONAsString(tableInfo *db2.BaseTable, params view2.ReqStorageUpdate) (res string, err error) {
	// reader
	_, readerSQLs, err := reader.New(db2.DatasourceClickHouse, i.ReaderParams{
		CreateType:              tableInfo.CreateType,
		IsShard:                 c.isShard(tableInfo.Database.Cluster),
		IsReplica:               c.isReplica(tableInfo.Database.Cluster),
		Cluster:                 tableInfo.Database.Cluster,
		Database:                tableInfo.Database.Name,
		Table:                   tableInfo.Name,
		Conn:                    c.Conn(),
		Brokers:                 params.KafkaBrokers,
		Topics:                  params.KafkaTopic,
		GroupName:               tableInfo.Database.Name + "_" + tableInfo.Name,
		KafkaNumConsumers:       params.KafkaConsumerNum,
		KafkaSkipBrokenMessages: params.KafkaSkipBrokenMessages,
	}).Create()
	if err != nil {
		return
	}
	return readerSQLs[0], nil
}

func (c *ClickHouseX) updateSwitcherJSONAsString(ct view2.ReqStorageCreate, timeView *db2.BaseView, timeViewList []*db2.BaseView, database *db2.BaseDatabase, tid int, customTimeField string, indexes map[string]*db2.BaseIndex) (res string, err error) {
	var parseTime string
	var parseWhere string
	if customTimeField == "" {
		parseTime = c.timeParseJSONAsString(ct.Typ, nil, ct.TimeField, ct.TimeFieldParent, ct.GetRawLogField())
		parseWhere = c.whereConditionSQLDefault(timeViewList, ct.GetRawLogField())
	} else {
		parseTime = c.timeParseJSONAsString(ct.Typ, timeView, ct.TimeField, ct.TimeFieldParent, ct.GetRawLogField())
		parseWhere = c.whereConditionSQLCurrent(timeView, ct.GetRawLogField())
	}

	params := i.SwitcherParams{
		CreateType:          constx2.TableCreateTypeJSONAsString,
		IsShard:             c.isShard(database.Cluster),
		IsReplica:           c.isReplica(database.Cluster),
		Cluster:             database.Cluster,
		Database:            database.Name,
		Table:               ct.TableName,
		Conn:                c.Conn(),
		RawLogField:         ct.RawLogField,
		RawLogFieldParent:   ct.RawLogFieldParent,
		ParseIndexes:        c.jsonExtractSQL(indexes, ct.GetRawLogField()),
		ParseFields:         ct.Mapping2Fields(ct.RawLogFieldParent),
		ParseTime:           parseTime,
		ParseWhere:          parseWhere,
		IsRawLogFieldString: ct.IsRawLogFieldString(),
	}
	if customTimeField != "" {
		params.CustomTimeField = timeView.Key
	}
	// 初始化 switcher
	sw := switcher.New(db2.DatasourceClickHouse, params)
	// 删除
	if err = sw.Delete(); err != nil {
		return
	}
	// 回滚
	defer func() {
		if err != nil {
			c.switcherRollback(tid, customTimeField)
		}
	}()
	// 新建
	_, switcherSQLs, err := sw.Create()
	if err != nil {
		return
	}
	return switcherSQLs[0], nil
}

// Deprecated: storageViewOperatorV3
func (c *ClickHouseX) storageViewOperatorV3(param view2.OperatorViewParams) (res string, err error) {
	databaseInfo, err := db2.DatabaseInfo(invoker.Db, param.Did)
	if err != nil {
		return
	}
	isCluster, err := c.isCluster(databaseInfo.Cluster)
	if err != nil {
		return
	}
	if isCluster == ModeCluster {
		param.TableName += "_local"
	}
	viewName := genViewName(databaseInfo.Name, param.TableName, param.CustomTimeField)
	defer func() {
		if err != nil {
			c.switcherRollback(param.Tid, param.CustomTimeField)
		}
	}()
	var (
		viewSQL string
	)
	jsonExtractSQL := ""
	if param.Tid != 0 {
		jsonExtractSQL = c.jsonExtractSQL(param.Indexes, constx2.UBWKafkaStreamField)
	}
	dName := genName(databaseInfo.Name, param.TableName)
	streamName := genStreamName(databaseInfo.Name, param.TableName)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	if isCluster == ModeCluster {
		if databaseInfo.Cluster == "" {
			err = constx2.ErrClusterNameEmpty
			return
		}
		viewDropSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER `%s` ;", viewName, databaseInfo.Cluster)
	}
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
		elog.Error("updateSwitcher", elog.String("viewDropSQL", viewDropSQL), elog.String("jsonExtractSQL", jsonExtractSQL), elog.String("viewName", viewName), elog.String("cluster", databaseInfo.Cluster))
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
	rs := db2.ReplicaStatusNo
	if c.isReplica(databaseInfo.Cluster) {
		rs = db2.ReplicaStatusYes
	}
	viewSQL, err = c.execView(bumo.Params{
		TableCreateType: constx2.TableCreateTypeUBW,
		TimeField:       param.TimeField,
		Cluster:         databaseInfo.Cluster,
		ReplicaStatus:   rs,
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
	if err != nil {
		return
	}
	if param.IsCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouseX) jsonExtractSQL(indexes map[string]*db2.BaseIndex, rawLogField string) string {
	jsonExtractSQL := ",\n"
	for _, obj := range indexes {
		if obj.RootName == "" {
			rawVal := fmt.Sprintf("replaceAll(JSONExtractRaw(%s, '%s'), '\"', '')", rawLogField, obj.Field)
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db2.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(toString(%s)) AS `%s`,\n", rawVal, hashFieldName)
				case db2.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(toString(%s)) AS `%s`,\n", rawVal, hashFieldName)
				}
			}
			if obj.Typ == db2.IndexTypeString {
				jsonExtractSQL += fmt.Sprintf("toNullable(toString(%s)) AS `%s`,\n", rawVal, obj.GetFieldName())
				continue
			}
			if obj.Typ == db2.IndexTypeRaw {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractRaw(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(%s) AS `%s`,\n", jsonExtractORM[obj.Typ], rawVal, obj.GetFieldName())
		} else {
			rawVal := fmt.Sprintf("replaceAll(JSONExtractRaw(JSONExtractRaw(%s, '%s'), '%s'), '\"', '')", rawLogField, obj.RootName, obj.Field)
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db2.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(toString(%s)) AS `%s`,\n", rawVal, hashFieldName)
				case db2.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(toString(%s)) AS `%s`,\n", rawVal, hashFieldName)
				}
			}
			// 在 version 21.11 后使用 JSON_VALUE(_raw_log_, '$._log_') 代替
			if obj.Typ == db2.IndexTypeString {
				jsonExtractSQL += fmt.Sprintf("toNullable(toString(%s)) AS `%s`,\n", rawVal, obj.GetFieldName())
				continue
			}
			if obj.Typ == db2.IndexTypeRaw {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractRaw(JSONExtractRaw(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(%s) AS `%s`,\n", jsonExtractORM[obj.Typ], rawVal, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",\n")
	return jsonExtractSQL
}

func (c *ClickHouseX) whereConditionSQLCurrentV3(current *db2.BaseView) string {
	rawLogField := constx2.UBWKafkaStreamField
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(%s, '%s') = 1", rawLogField, current.Key)
}

func (c *ClickHouseX) whereConditionSQLDefaultV3(list []*db2.BaseView) string {
	rawLogField := constx2.UBWKafkaStreamField
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

func (c *ClickHouseX) timeParseSQLV3(typ int, v *db2.BaseView, timeField string) string {
	rawLogField := constx2.UBWKafkaStreamField
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

func (c *ClickHouseX) whereConditionSQLCurrent(current *db2.BaseView, rawLogField string) string {
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(%s, '%s') = 1", rawLogField, current.Key)
}

func (c *ClickHouseX) whereConditionSQLDefault(list []*db2.BaseView, rawLogField string) string {
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

func (c *ClickHouseX) timeParseJSONAsString(typ int, v *db2.BaseView, timeField, timeFieldParent, rawLogField string) string {
	l := "_log"
	if timeFieldParent != "" {
		l = fmt.Sprintf("JSONExtractRaw(_log, '%s')", timeFieldParent)
	}
	if v != nil && v.Format == "fromUnixTimestamp64Micro" && v.IsUseDefaultTime == 0 {
		timeField = fmt.Sprintf("JSONExtractInt(%s, '%s')", l, timeField)
	} else if typ == TableTypeFloat {
		timeField = fmt.Sprintf("JSONExtractFloat(%s, '%s')", l, timeField)
	} else {
		timeField = fmt.Sprintf("JSONExtractString(%s, '%s')", l, timeField)
	}
	return c.timeParseSQL(typ, v, timeField, rawLogField)
}

func (c *ClickHouseX) timeParseSQL(typ int, v *db2.BaseView, timeField, rawLogField string) string {
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

func (c *ClickHouseX) updateSwitcherJSONEachRow(typ, tid int, did int, table, customTimeField string, current *db2.BaseView,
	list []*db2.BaseView, indexes map[string]*db2.BaseIndex, isCreate bool, ct view2.ReqStorageCreate) (res string, err error) {
	databaseInfo, err := db2.DatabaseInfo(invoker.Db, did)
	if err != nil {
		return
	}
	isCluster, err := c.isCluster(databaseInfo.Cluster)
	if err != nil {
		return
	}
	if isCluster == ModeCluster {
		table += "_local"
	}
	viewName := genViewName(databaseInfo.Name, table, customTimeField)

	defer func() {
		if err != nil {
			c.switcherRollback(tid, customTimeField)
		}
	}()

	jsonExtractSQL := ""
	if tid != 0 {
		jsonExtractSQL = c.jsonExtractSQL(indexes, ct.GetRawLogField())
	}
	dName := genName(databaseInfo.Name, table)
	streamName := genStreamName(databaseInfo.Name, table)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	if isCluster == ModeCluster {
		if databaseInfo.Cluster == "" {
			err = constx2.ErrClusterNameEmpty
			return
		}
		viewDropSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER `%s` ;", viewName, databaseInfo.Cluster)
	}
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
		elog.Error("updateSwitcher", elog.String("viewDropSQL", viewDropSQL), elog.String("jsonExtractSQL", jsonExtractSQL), elog.String("viewName", viewName), elog.String("cluster", databaseInfo.Cluster))
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
	rs := db2.ReplicaStatusNo
	if c.isReplica(databaseInfo.Cluster) {
		rs = db2.ReplicaStatusYes
	}
	viewSQL, err := c.execView(bumo.Params{
		KafkaJsonMapping: ct.Mapping2String(false, ""),
		LogField:         ct.RawLogField,
		TimeField:        ct.TimeField,
		Cluster:          databaseInfo.Cluster,
		ReplicaStatus:    rs,
		View: bumo.ParamsView{
			ViewTable:    viewName,
			TargetTable:  dName,
			TimeConvert:  timeConv,
			CommonFields: jsonExtractSQL,
			SourceTable:  streamName,
			Where:        whereCond,
		},
	})
	if err != nil {
		return "", err
	}
	if isCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouseX) updateSwitcher(typ, tid int, did int, table, customTimeField string, current *db2.BaseView, list []*db2.BaseView, indexes map[string]*db2.BaseIndex, isCreate bool) (res string, err error) {
	// 基础信息获取
	tableInfo, err := db2.TableInfo(invoker.Db, tid)
	if err != nil {
		return "", err
	}
	rsc := view2.ReqStorageCreate{}
	if tableInfo.AnyJSON != "" {
		rsc = view2.ReqStorageCreateUnmarshal(tableInfo.AnyJSON)
	}
	// 新版本参数组装
	switch tableInfo.CreateType {
	case constx2.TableCreateTypeUBW:
		return c.storageViewOperatorV3(view2.OperatorViewParams{
			Typ:              typ,
			Tid:              tid,
			Did:              did,
			TableName:        table,
			CustomTimeField:  customTimeField,
			Current:          current,
			List:             list,
			Indexes:          indexes,
			IsCreate:         isCreate,
			TimeField:        tableInfo.TimeField,
			IsKafkaTimestamp: tableInfo.IsKafkaTimestamp,
			RawLogField:      tableInfo.RawLogField,
			Database:         tableInfo.Database,
		})
	case constx2.TableCreateTypeJSONAsString:
		return c.updateSwitcherJSONAsString(rsc, current, list, tableInfo.Database, tid, customTimeField, indexes)
	default:
		// 默认执行 JSONAsEachRow 模式
		return c.updateSwitcherJSONEachRow(typ, tid, did, table, customTimeField, current, list, indexes, isCreate, rsc)
	}
}

func (c *ClickHouseX) switcherRollback(tid int, key string) {
	tableInfo, err := db2.TableInfo(invoker.Db, tid)
	if err != nil {
		elog.Error("updateSwitcher", elog.Any("err", err.Error()), elog.String("step", "doViewRollback"))
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
		viewInfo, err := db2.ViewInfoX(condsView)
		if err != nil {
			elog.Error("updateSwitcher", elog.Any("err", err.Error()), elog.String("step", "doViewRollbackViewInfoX"))
			return
		}
		viewQuery = viewInfo.SqlView
	}
	_, err = c.db.Exec(viewQuery)
	if err != nil {
		elog.Error("updateSwitcher", elog.Any("err", err.Error()), elog.String("step", "Exec"), elog.String("viewQuery", viewQuery))
		return
	}
}

func (c *ClickHouseX) logsTimelineSQL(param view2.ReqQuery, tid int) (sql string) {
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, _ := db2.ViewList(invoker.Db, conds)
	orderByField := param.TimeField
	if len(views) > 0 {
		orderByField = db2.TimeFieldNanoseconds
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

func (c *ClickHouseX) logsSQL(param view2.ReqQuery, tid int) (sql, optSQL, originalWhere string) {
	st := time.Now()
	conds := egorm.Conds{}
	conds["tid"] = tid
	views, _ := db2.ViewList(invoker.Db, conds)
	c1 := time.Since(st).Milliseconds()
	orderByField := param.TimeField
	if len(views) > 0 {
		orderByField = db2.TimeFieldNanoseconds
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

func (c *ClickHouseX) queryTransform(params view2.ReqQuery, isOptimized bool) string {
	if isOptimized {
		params.Query = queryTransformHash(params) // hash transform
	}
	table, _ := db2.TableInfo(invoker.Db, params.Tid)
	query := queryTransformLike(table.CreateType, table.RawLogField, params.Query) // _raw_log_ like
	if query == "" {
		return query
	}
	return fmt.Sprintf("AND (%s)", query)
}

func (c *ClickHouseX) countSQL(param view2.ReqQuery) (sql string) {
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
func (c *ClickHouseX) chartSQL(param view2.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, %s as timeline  FROM %s WHERE "+genTimeCondition(param)+" %s GROUP BY %s ORDER BY %s ASC",
		param.GroupByCond,
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true),
		param.GroupByCond,
		param.GroupByCond)
	return
}

func (c *ClickHouseX) groupBySQL(param view2.ReqQuery) (sql string) {
	sql = fmt.Sprintf("SELECT count(*) as count, `%s` as f FROM %s WHERE "+genTimeCondition(param)+" %s group by `%s`  order by count desc limit 10",
		param.Field,
		param.DatabaseTable,
		param.ST, param.ET,
		c.queryTransform(param, true),
		param.Field)
	return
}

func (c *ClickHouseX) doQuery(sql string, isShowNull bool) (res []map[string]interface{}, err error) {
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
				if isShowNull {
					line[fields[k]] = "[NULL]"
				} else {
					line[fields[k]] = ""
				}
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

func (c *ClickHouseX) timeFieldEqual(param view2.ReqQuery, tid int) string {
	var res string
	s := c.logsTimelineSQL(param, tid)
	out, err := c.doQuery(s, false)
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

func (c *ClickHouseX) execView(params bumo.Params) (string, error) {
	var obj builder.Builder
	isCluster, err := c.isCluster(params.Cluster)
	if err != nil {
		return "", errors.Wrap(err, "isCluster get failed")
	}
	switch isCluster {
	case ModeCluster:
		obj = new(cluster.ViewBuilder)
	default:
		obj = new(standalone.ViewBuilder)
	}
	return builder.Do(obj, params), nil
}

func (c *ClickHouseX) CalculateInterval(interval int64, timeField string) (string, int64) {
	if interval == 0 {
		return "", 0
	}
	if interval <= 60*5 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 second)", timeField), 1
	} else if interval <= 60*30 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 minute)", timeField), 60
	} else if interval <= 60*60*4 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 10 minute)", timeField), 600
	} else if interval <= 60*60*24 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 hour)", timeField), 3600
	} else if interval <= 60*60*24*7 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 6 hour)", timeField), 21600
	}
	return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 day)", timeField), 86400
}
