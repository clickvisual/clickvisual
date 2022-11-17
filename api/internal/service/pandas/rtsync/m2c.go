package rtsync

import (
	"errors"
	"fmt"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/source"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type MySQL2ClickHouse struct {
	iid          int
	nodeId       int
	sc           *view.SyncContent
	involvedSQLs map[string]string
}

// Run
// MaterializeMySQL
// CREATE DATABASE [IF NOT EXISTS] db_name [ON CLUSTER cluster]
// ENGINE = MySQL('host:port', 'database', 'user', 'password')
// 会产生一个冗余表
//
// CREATE DATABASE [IF NOT EXISTS] db_name [ON CLUSTER cluster]
// ENGINE = MaterializeMySQL('host:port', 'database', 'user', 'password')
// [SETTINGS...]
//
// where SETTINGS are:
// [ { include_tables | exclude_tables } ]
// [ skip_error_count ]
// [ skip_unsupported_tables ]
// [ order_by_only_primary_key ]
// [ enable_binlog_reserved ]
// [ shard_model ]
// [ rate_limiter_row_count_per_second ]
func (c *MySQL2ClickHouse) Run() (map[string]string, error) {
	return nil, errors.New("real-time synchronization from mysql to Clickhouse is not supported")
	// var (
	// 	ins db.BaseInstance
	// 	err error
	// )
	// c.involvedSQLs = make(map[string]string)
	// if ins, err = db.InstanceInfo(invoker.Db, c.iid); err != nil {
	// 	elog.Error("MySQL2ClickHouse", elog.String("step", "instanceInfo"), elog.String("error", err.Error()))
	// 	return c.involvedSQLs, err
	// }
	// if err = c.mysqlEngineDatabase(ins, c.sc); err != nil {
	// 	elog.Error("MySQL2ClickHouse", elog.String("step", "mysqlEngineTable"), elog.Any("involvedSQLs", c.involvedSQLs), elog.String("error", err.Error()))
	// 	return c.involvedSQLs, err
	// }
	// if err = c.execTargetSQL(ins, c.sc.Target.TargetBefore); err != nil {
	// 	elog.Error("MySQL2ClickHouse", elog.String("step", "TargetBefore"), elog.String("error", err.Error()))
	// 	return c.involvedSQLs, err
	// }
	// var viewTableName string
	// if viewTableName, err = c.materializedView(ins); err != nil {
	// 	elog.Error("MySQL2ClickHouse", elog.String("step", "c2mMaterialView"), elog.Any("involvedSQLs", c.involvedSQLs), elog.String("error", err.Error()))
	// 	return c.involvedSQLs, err
	// }
	// if err = c.insert(ins, viewTableName); err != nil {
	// 	elog.Error("MySQL2ClickHouse", elog.String("step", "insert"), elog.Any("involvedSQLs", c.involvedSQLs), elog.String("error", err.Error()))
	// 	_ = dropTable(viewTableName, ins)
	// 	return c.involvedSQLs, err
	// }
	// if err = c.execTargetSQL(ins, c.sc.Target.TargetAfter); err != nil {
	// 	elog.Error("MySQL2ClickHouse", elog.String("step", "TargetAfter"), elog.String("error", err.Error()))
	// 	return c.involvedSQLs, err
	// }
	// _ = dropTable(viewTableName, ins)
	// _ = db.NodeUpdate(invoker.Db, c.nodeId, map[string]interface{}{"status": db.NodeStatusFinish})
	// return c.involvedSQLs, nil
}

func (c *MySQL2ClickHouse) mysqlEngineDatabase(ins db.BaseInstance, sc *view.SyncContent) (err error) {
	// 创建在 clickhouse 中的表是否对用户可见？如果不可见，涉及集群操作，默认采用第一集群？
	dbNameClusterInfo := mysqlEngineDatabaseName(sc)
	if ins.Mode == inquiry.ModeCluster {
		dbNameClusterInfo = fmt.Sprintf("`%s` ON CLUSTER '%s'", dbNameClusterInfo, sc.Cluster())
	}
	s, err := db.SourceInfo(invoker.Db, c.sc.Source.SourceId)
	if err != nil {
		return
	}
	completeSQL := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s ENGINE = MySQL('%s', '%s', '%s', '%s')",
		dbNameClusterInfo,
		s.URL,
		sc.Source.Database,
		s.UserName,
		s.Password)
	elog.Debug("MySQL2ClickHouse", elog.String("step", "mysqlEngineDatabase"), elog.String("completeSQL", completeSQL))
	c.involvedSQLs["mysqlEngineDatabase"] = completeSQL
	return source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(completeSQL)
}

func (c *MySQL2ClickHouse) Stop() error {
	var (
		ins db.BaseInstance
		err error
	)
	if ins, err = db.InstanceInfo(invoker.Db, c.iid); err != nil {
		elog.Error("MySQL2ClickHouse", elog.String("step", "instanceInfo"), elog.String("error", err.Error()))
		return err
	}
	if err = dropMaterialView(ins, c.nodeId, c.sc); err != nil {
		return err
	}
	return nil
}

func (c *MySQL2ClickHouse) materializedView(ins db.BaseInstance) (string, error) {
	viewClusterInfo := materialView(c.sc)
	if ins.Mode == inquiry.ModeCluster {
		viewClusterInfo = fmt.Sprintf("%s ON CLUSTER '%s'", viewClusterInfo, c.sc.Cluster())
	}
	// Deletes the materialized view from the last execution
	if err := dropMaterialView(ins, c.nodeId, c.sc); err != nil {
		return "", err
	}

	sourceTableName := fmt.Sprintf("`%s`.`%s`", mysqlEngineDatabaseName(c.sc), c.sc.Source.Table)
	completeSQL := fmt.Sprintf("CREATE MATERIALIZED VIEW %s Engine=Memory POPULATE AS SELECT %s FROM %s WHERE %s",
		viewClusterInfo, mapping(c.sc.Mapping), sourceTableName, where(c.sc.Source.SourceFilter))

	elog.Debug("MySQL2ClickHouse", elog.String("step", "insert"), elog.String("completeSQL", completeSQL))

	c.involvedSQLs["m2cMaterialView"] = completeSQL

	return viewClusterInfo, source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(completeSQL)
}

func (c *MySQL2ClickHouse) insert(ins db.BaseInstance, viewTableName string) error {
	viewClusterInfo := materialView(c.sc)
	targetTableName := fmt.Sprintf("`%s`.`%s`", c.sc.Target.Database, c.sc.Target.Table)
	completeSQL := fmt.Sprintf("INSERT INTO %s SELECT * FROM %s", targetTableName, viewClusterInfo)

	elog.Debug("MySQL2ClickHouse", elog.String("viewTableName", viewTableName), elog.String("step", "m2cMaterialView"), elog.String("completeSQL", completeSQL))

	c.involvedSQLs["m2cInsert"] = completeSQL

	return source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(completeSQL)
}

func (c *MySQL2ClickHouse) execTargetSQL(ins db.BaseInstance, sql string) error {
	if sql == "" {
		return nil
	}
	return source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(sql)
}
