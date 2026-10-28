package factory

import (
	"strings"
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builder"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builder/bumo"
	clusterbuilder "github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builder/cluster"
	standalonebuilder "github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builder/standalone"
	builderv2 "github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builderv2"
)

func TestTTLOnlyDropPartsGeneratedForLogTables(t *testing.T) {
	assertSetting := func(label, sql string) {
		t.Helper()
		if !strings.Contains(sql, "ttl_only_drop_parts = 1") {
			t.Fatalf("%s SQL does not enable ttl_only_drop_parts: %s", label, sql)
		}
	}

	params := bumo.Params{Data: bumo.ParamsData{TableName: "logs.app_stdout", Days: 3}}
	assertSetting("standalone", builder.Do(new(standalonebuilder.DataBuilder), params))

	params.Cluster = "logs_cluster"
	params.ReplicaStatus = bumo.ReplicaStatusYes
	assertSetting("cluster", builder.Do(new(clusterbuilder.DataBuilder), params))

	creator, err := builderv2.GetTableCreator(constx.TableCreateTypeBufferNullDataPipe)
	if err != nil {
		t.Fatal(err)
	}
	creator.SetParams(builderv2.Params{Database: "logs", Table: "app_stdout", TTL: 3})
	_, sqls := creator.GetSQLs()
	for _, sql := range sqls {
		if strings.Contains(sql, "CREATE TABLE") && strings.Contains(sql, "_time_second_") {
			assertSetting("builderv2", sql)
		}
	}
}
