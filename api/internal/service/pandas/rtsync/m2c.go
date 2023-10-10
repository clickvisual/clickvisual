package rtsync

import (
	"errors"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type MySQL2ClickHouse struct {
	iid    int
	nodeId int
	sc     *view.SyncContent
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
