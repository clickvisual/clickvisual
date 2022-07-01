package rtsync

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/source"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func mapping(mappings []view.IntegrationMapping) (res string) {
	for _, m := range mappings {
		if res == "" {
			res = fmt.Sprintf("%s as %s", mappingKV(m.SourceType, m.Source), m.Target)
		} else {
			res = fmt.Sprintf("%s, %s as %s", res, mappingKV(m.SourceType, m.Source), m.Target)
		}
	}
	return
}

func mappingKV(typ string, val string) string {
	lowerTyp := strings.ToLower(typ)
	if strings.Contains(lowerTyp, "int") {
		return fmt.Sprintf("ifNull(%s, %d)", val, 0)
	}
	if strings.Contains(lowerTyp, "string") || strings.Contains(lowerTyp, "varchar") {
		return fmt.Sprintf("ifNull(%s, %s)", val, "''")
	}
	if strings.Contains(lowerTyp, "float") {
		return fmt.Sprintf("ifNull(%s, %d)", val, 0)
	}
	return val
}

func where(f string) string {
	if f == "" {
		return "1=1"
	}
	return f
}

func materialView(s *view.SyncContent) string {
	switch syncTypeJudgment(s) {
	case syncTypeClickHouse2MySQL:
		return fmt.Sprintf("`%s`.`clickvisualrtsync_%s_view`", s.Source.Database, s.Target.Table)
	case syncTypeMySQL2ClickHouse:
		return fmt.Sprintf("`%s`.`clickvisualrtsync_%s_view`", s.Target.Database, s.Target.Table)
	}
	return ""
}

// 这个方案需要具体的字段映射类型
// func mysqlEngineTable(ins db.BaseInstance, sc *view.SyncContent) (completeSQL string, err error) {
// 	// 创建在 clickhouse 中的表是否对用户可见？如果不可见，涉及集群操作，默认采用第一集群？
// 	dbNameClusterInfo := mysqlEngineDatabaseName(sc)
// 	if ins.Mode == inquiry.ModeCluster {
// 		dbNameClusterInfo = fmt.Sprintf("`%s` ON CLUSTER %s", dbNameClusterInfo, sc.Cluster())
// 	}
// 	s, err := db.SourceInfo(invoker.Db, sc.Target.SourceId)
// 	if err != nil {
// 		return
// 	}
// 	completeSQL = fmt.Sprintf("CREATE TABLE %s (%s) ENGINE = MySQL('%s', '%s',  '%s', '%s', '%s');",
// 		dbNameClusterInfo,
// 		s.URL,
// 		sc.Target.Database,
// 		sc.Target.Table,
// 		s.UserName,
// 		s.Password)
// 	invoker.Logger.Debug("ClickHouse2MySQL", elog.String("step", "mysqlEngineDatabase"), elog.String("completeSQL", completeSQL))
// 	err = source.Instantiate(&source.Source{
// 		DSN: ins.Dsn,
// 		Typ: db.SourceTypClickHouse,
// 	}).Exec(completeSQL)
// 	return
// }

func mysqlEngineDatabaseName(s *view.SyncContent) string {
	switch syncTypeJudgment(s) {
	case syncTypeClickHouse2MySQL:
		return fmt.Sprintf("clickvisualrtsync_%s", s.Source.Database)
	case syncTypeMySQL2ClickHouse:
		return fmt.Sprintf("clickvisualrtsync_%s", s.Target.Database)
	}
	return ""
}

func mysqlEngineTableName(s *view.SyncContent) string {
	switch syncTypeJudgment(s) {
	case syncTypeClickHouse2MySQL:
		return fmt.Sprintf("`%s`.`clickvisualrtsync_%s`", s.Source.Database, s.Target.Table)
	case syncTypeMySQL2ClickHouse:
		return fmt.Sprintf("`%s`.`clickvisualrtsync_%s`", s.Target.Database, s.Target.Table)
	}
	return ""
}

func dropMaterialView(ins db.BaseInstance, nodeId int, sc *view.SyncContent) error {
	nc, err := db.NodeContentInfo(invoker.Db, nodeId)
	if err != nil {
		return err
	}
	invoker.Logger.Debug("dropMaterialView", elog.Int("nodeId", nodeId), elog.Any("nc", nc))
	var viewClusterInfo string
	if nc.PreviousContent != "" {
		previousContent := view.SyncContent{}
		if err = json.Unmarshal([]byte(nc.PreviousContent), &previousContent); err != nil {
			return err
		}
		viewClusterInfo = materialView(&previousContent)
	}
	if viewClusterInfo == "" {
		viewClusterInfo = materialView(sc)
	}
	if ins.Mode == inquiry.ModeCluster {
		viewClusterInfo = fmt.Sprintf("%s ON CLUSTER '%s'", viewClusterInfo, sc.Cluster())
	}
	// 删除上次执行产生的物化视图
	// _, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s ON CLUSTER '%s';", name, cluster))
	// _, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s.%s ON CLUSTER '%s';", database, table, cluster))
	dmv := fmt.Sprintf("DROP TABLE IF EXISTS %s", viewClusterInfo)

	invoker.Logger.Debug("dropMaterialView", elog.Int("nodeId", nodeId), elog.Any("sql", dmv))

	if err = source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(dmv); err != nil {
		return err
	}
	return nil
}

func dropTable(tableName string, ins db.BaseInstance) error {
	if tableName == "" {
		return nil
	}
	dmv := fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName)
	if err := source.Instantiate(&source.Source{
		DSN: ins.Dsn,
		Typ: db.SourceTypClickHouse,
	}).Exec(dmv); err != nil {
		return err
	}
	return nil
}
