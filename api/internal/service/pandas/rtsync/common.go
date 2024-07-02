package rtsync

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/clickhouse"
	"github.com/clickvisual/clickvisual/api/internal/service/source"
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

func mysqlEngineDatabaseName(s *view.SyncContent) string {
	return fmt.Sprintf("clickvisualrtsync_%s", s.Source.Database)
}

func dropMaterialView(ins db2.BaseInstance, nodeId int, sc *view.SyncContent) error {
	nc, err := db2.NodeContentInfo(invoker.Db, nodeId)
	if err != nil {
		return err
	}
	elog.Debug("dropMaterialView", elog.Int("nodeId", nodeId), elog.Any("nc", nc))
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
	if ins.Mode == clickhouse.ModeCluster {
		viewClusterInfo = fmt.Sprintf("%s ON CLUSTER '%s'", viewClusterInfo, sc.Cluster())
	}
	// 删除上次执行产生的物化视图
	// _, err = c.db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s ON CLUSTER '%s';", name, cluster))
	// _, err = c.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s.%s ON CLUSTER '%s';", database, table, cluster))
	dmv := fmt.Sprintf("DROP TABLE IF EXISTS %s", viewClusterInfo)

	elog.Debug("dropMaterialView", elog.Int("nodeId", nodeId), elog.Any("sql", dmv))

	if err = source.Instantiate(&source.Source{
		DSN: ins.GetDSN(),
		Typ: db2.SourceTypClickHouse,
	}).Exec(dmv); err != nil {
		return err
	}
	return nil
}
