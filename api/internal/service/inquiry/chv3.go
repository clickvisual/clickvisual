package inquiry

import (
	"context"
	"fmt"
	"time"

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
		invoker.Logger.Error("CreateTable", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		invoker.Logger.Error("CreateTable", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
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
		invoker.Logger.Error("CreateTable", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
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
		invoker.Logger.Debug("CreateTable", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			invoker.Logger.Error("CreateTable", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
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
	sc, errGetTableCreator := builderv2.GetTableCreator(builderv2.StorageTypeTraceCal)
	if errGetTableCreator != nil {
		invoker.Logger.Error("CreateTable", elog.String("step", "GetTableCreator"), elog.FieldErr(errGetTableCreator))
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
	if _, err = sc.Execute(sc.GetMergeTreeSQL()); err != nil {
		invoker.Logger.Error("CreateTable", elog.String("step", "GetDistributedSQL"), elog.FieldErr(err))
		return
	}
	if _, err = sc.Execute(sc.GetDistributedSQL()); err != nil {
		invoker.Logger.Error("CreateTable", elog.String("step", "GetDistributedSQL"), elog.FieldErr(err))
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

	sql := fmt.Sprintf("select * from `%s`.`%s` where timestamp>%d and timestamp<%d", database.(string), table.(string)+db.SuffixJaegerJSON, st.(int), et.(int))

	elog.Debug("clickHouse", elog.FieldComponent("GetTraceGraph"), elog.FieldName("sql"), elog.String("sql", sql))

	res, err := c.db.Query(sql)
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
	sql := fmt.Sprintf("SHOW CREATE table `%s`.`%s`;", database, table)
	res, err := c.db.Query(sql)
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
			Cluster:     cl["cluster"].(string),
			ShardNum:    cl["shard_num"].(uint32),
			ShardWeight: cl["shard_weight"].(uint32),
			ReplicaNum:  cl["replica_num"].(uint32),
		}
		l = append(l, &row)
		m[cl["cluster"].(string)] = &row
	}
	return
}
