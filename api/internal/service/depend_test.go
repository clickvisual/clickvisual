package service

import (
	"reflect"
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func Test_customParsing(t *testing.T) {
	type args struct {
		row *view.SystemTables
	}
	tests := []struct {
		name  string
		args  args
		downs []string
		ups   []string
	}{
		// TODO: Add test cases.
		// CREATE MATERIALIZED VIEW dev_nocnoc.app_stdout_view TO dev_nocnoc.app_stdout (`_time_second_` DateTime,
		// GetLogs dev_nocnoc.app_stdout
		{
			name: "test-1",
			args: args{
				row: &view.SystemTables{
					Database:          "t1",
					DownDatabaseTable: make([]string, 0),
					CreateTableQuery:  "CREATE MATERIALIZED VIEW dev_nocnoc.app_stdout_view TO dev_nocnoc.app_stdout (`_time_second_` DateTime,",
				},
			},
			downs: []string{"dev_nocnoc.app_stdout"},
			ups:   make([]string, 0),
		},
		//  '创建文件数') ENGINE = Distributed('shard2-repl1', 'shard', 'dws_collaboration_7d_statistic_by_department_daily', rand())
		// GetLogs dws_collaboration_7d_statistic_by_department_daily
		{
			name: "test-2",
			args: args{
				row: &view.SystemTables{
					Database:          "t1",
					DownDatabaseTable: make([]string, 0),
					CreateTableQuery:  "'创建文件数') ENGINE = Distributed('shard2-repl1', 'shard', 'dws_collaboration_7d_statistic_by_department_daily', rand())",
				},
			},
			downs: make([]string, 0),
			ups:   []string{"shard.dws_collaboration_7d_statistic_by_department_daily"},
		},
		{
			name: "test-3",
			args: args{
				row: &view.SystemTables{
					Database:          "t1",
					DownDatabaseTable: make([]string, 0),
					CreateTableQuery:  "CREATE TABLE clickvisual_default.app_stdout (`_time_second_` DateTime, `_time_nanosecond_` DateTime64(9), `_source_` String, `_cluster_` String, `_log_agent_` String, `_namespace_` String, `_node_name_` String, `_node_ip_` String, `_container_name_` String, `_pod_name_` String, `_raw_log_` String, `method` Nullable(String), `msg` Nullable(String), `category` Nullable(String), `env` Nullable(String), `application` Nullable(String), `step` Nullable(String), `level` Nullable(Int64), `lv` Nullable(String), `status` Nullable(Int64)) ENGINE = Distributed('shard2-repl1', 'clickvisual_default', 'app_stdout_local', rand())",
				},
			},
			downs: make([]string, 0),
			ups:   []string{"clickvisual_default.app_stdout_local"},
		},
	}
	d := NewDependence()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			downs, ups := d.parsing(tt.args.row)
			if !reflect.DeepEqual(downs, tt.downs) {
				t.Errorf("parsing() = %v, want %v", downs, tt.downs)
			}
			if !reflect.DeepEqual(ups, tt.ups) {
				t.Errorf("parsing() = %v, want %v", ups, tt.ups)
			}
		})
	}
}
