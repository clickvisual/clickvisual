package rtsync

import (
	"encoding/json"
	"fmt"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/source"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type ClickHouse2MySQL struct {
	iid          int
	nodeId       int
	sc           *view.SyncContent
	involvedSQLs map[string]string
}

// Stop
// Drop Materialized View -> MySQL engine
func (c *ClickHouse2MySQL) Stop() error {
	var (
		ins db.BaseInstance
		err error
	)
	if ins, err = db.InstanceInfo(invoker.Db, c.iid); err != nil {
		invoker.Logger.Error("ClickHouse2MySQL", elog.String("step", "instanceInfo"), elog.String("error", err.Error()))
		return err
	}
	if err = c.dropMaterialView(ins); err != nil {
		return err
	}
	return nil
}

// Run
// Materialized View -> MySQL engine
// CREATE DATABASE [IF NOT EXISTS] db_name [ON CLUSTER cluster]
// ENGINE = MySQL('host:port', 'database', 'user', 'password')
func (c *ClickHouse2MySQL) Run() (map[string]string, error) {
	var (
		ins db.BaseInstance
		err error
	)
	c.involvedSQLs = make(map[string]string)
	if ins, err = db.InstanceInfo(invoker.Db, c.iid); err != nil {
		invoker.Logger.Error("ClickHouse2MySQL", elog.String("step", "instanceInfo"), elog.String("error", err.Error()))
		return c.involvedSQLs, err
	}
	if err = c.mysqlEngineDatabase(ins); err != nil {
		invoker.Logger.Error("ClickHouse2MySQL", elog.String("step", "mysqlEngineDatabase"), elog.String("error", err.Error()))
		return c.involvedSQLs, err
	}
	if err = c.execTargetSQL(c.sc.Target.TargetBefore); err != nil {
		invoker.Logger.Error("ClickHouse2MySQL", elog.String("step", "TargetBefore"), elog.String("error", err.Error()))
		return c.involvedSQLs, err
	}
	if err = c.materializedView(ins); err != nil {
		invoker.Logger.Error("ClickHouse2MySQL", elog.String("step", "c2mMaterialView"), elog.String("error", err.Error()))
		return c.involvedSQLs, err
	}
	if err = c.execTargetSQL(c.sc.Target.TargetAfter); err != nil {
		invoker.Logger.Error("ClickHouse2MySQL", elog.String("step", "TargetAfter"), elog.String("error", err.Error()))
		return c.involvedSQLs, err
	}
	return c.involvedSQLs, err
}

func (c *ClickHouse2MySQL) mysqlEngineDatabase(ins db.BaseInstance) error {
	// 创建在 clickhouse 中的表是否对用户可见？如果不可见，涉及集群操作，默认采用第一集群？
	dbNameClusterInfo := c2mMysqlEngineDatabaseName(c.sc)
	if ins.Mode == inquiry.ModeCluster {
		dbNameClusterInfo = fmt.Sprintf("`%s` ON CLUSTER %s", dbNameClusterInfo, c.sc.Cluster())
	}
	s, err := db.SourceInfo(invoker.Db, c.sc.Target.SourceId)
	if err != nil {
		return err
	}
	completeSQL := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s ENGINE = MySQL('%s', '%s', '%s', '%s')",
		dbNameClusterInfo,
		s.URL,
		c.sc.Target.Database,
		s.UserName,
		s.Password)

	invoker.Logger.Debug("ClickHouse2MySQL", elog.String("step", "mysqlEngineDatabase"), elog.String("completeSQL", completeSQL))
	c.involvedSQLs["mysqlEngineDatabase"] = completeSQL
	return source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(completeSQL)
}

func (c *ClickHouse2MySQL) materializedView(ins db.BaseInstance) error {
	viewClusterInfo := c2mMaterialView(c.sc)
	if ins.Mode == inquiry.ModeCluster {
		viewClusterInfo = fmt.Sprintf("%s ON CLUSTER %s", viewClusterInfo, c.sc.Cluster())
	}
	// Deletes the materialized view from the last execution
	if err := c.dropMaterialView(ins); err != nil {
		return err
	}

	viewClusterInfo = fmt.Sprintf("%s TO `%s`.`%s` AS", viewClusterInfo, c2mMysqlEngineDatabaseName(c.sc), c.sc.Target.Table)
	sourceTableName := fmt.Sprintf("`%s`.`%s`", c.sc.Source.Database, c.sc.Source.Table)
	completeSQL := fmt.Sprintf("CREATE MATERIALIZED VIEW %s SELECT %s FROM %s WHERE %s",
		viewClusterInfo, mapping(c.sc.Mapping), sourceTableName, where(c.sc.Source.SourceFilter))

	invoker.Logger.Debug("ClickHouse2MySQL", elog.String("step", "c2mMaterialView"), elog.String("completeSQL", completeSQL))

	c.involvedSQLs["c2mMaterialView"] = completeSQL

	return source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(completeSQL)
}

func (c *ClickHouse2MySQL) execTargetSQL(sql string) error {
	if sql == "" {
		return nil
	}
	mysqlTarget, err := db.SourceInfo(invoker.Db, c.sc.Target.SourceId)
	if err != nil {
		return err
	}
	return source.Instantiate(&source.Source{
		URL:      mysqlTarget.URL,
		UserName: mysqlTarget.UserName,
		Password: mysqlTarget.Password,
		Typ:      db.SourceTypMySQL,
	}).Exec(sql)
}

func mapping(mappings []view.IntegrationMapping) (res string) {
	for _, m := range mappings {
		if res == "" {
			res = fmt.Sprintf("%s as %s", m.Source, m.Target)
		} else {
			res = fmt.Sprintf("%s, %s as %s", res, m.Source, m.Target)
		}
	}
	return
}

func where(f string) string {
	if f == "" {
		return "1=1"
	}
	return f
}

func c2mMaterialView(s *view.SyncContent) string {
	return fmt.Sprintf("`%s`.`%s`", s.Source.Database, s.Source.Table+"_rtsync_"+s.Target.Table)
}

func c2mMysqlEngineDatabaseName(s *view.SyncContent) string {
	return fmt.Sprintf("clickvisual_rtsync_%s", s.Target.Database)
}

func (c *ClickHouse2MySQL) dropMaterialView(ins db.BaseInstance) error {
	nc, err := db.NodeContentInfo(invoker.Db, c.nodeId)
	if err != nil {
		return err
	}
	previousContent := view.SyncContent{}
	if err = json.Unmarshal([]byte(nc.PreviousContent), &previousContent); err != nil {
		return err
	}
	viewClusterInfo := c2mMaterialView(&previousContent)
	if ins.Mode == inquiry.ModeCluster {
		viewClusterInfo = fmt.Sprintf("%s ON CLUSTER %s", viewClusterInfo, c.sc.Cluster())
	}
	// 删除上次执行产生的物化视图
	// _, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s ON CLUSTER '%s';", name, cluster))
	// _, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s.%s ON CLUSTER '%s';", database, table, cluster))
	if err = source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", viewClusterInfo)); err != nil {
		return err
	}
	return nil
}
