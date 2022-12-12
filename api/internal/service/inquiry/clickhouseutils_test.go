package inquiry

import (
	"testing"
)

func Test_getDistributedSubTableName(t *testing.T) {
	type args struct {
		sql string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				sql: `CREATE TABLE mogo_shimo_dev.shimodev_svc_front_tracker
(
    '_time_second_' DateTime,
    '_time_nanosecond_' DateTime64(9),
    '_source_' String,
    '_cluster_' String,
    '_log_agent_' String,
    '_namespace_' String,
    '_node_name_' String,
    '_node_ip_' String,
    '_container_name_' String,
    '_pod_name_' String,
    '_raw_log_' String,
    'catetory' Nullable(String),
    'zapmsg' Nullable(String),
    'level' Nullable(String),
    'remote_address' Nullable(String),
    'body' Nullable(String)
)
ENGINE = Distributed('shard2-repl1', 'mogo_shimo_dev', 'shimodev_svc_front_tracker_local', rand())`,
			},
			want: "shimodev_svc_front_tracker_local",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got, _ := getDistributedSubTableName(tt.args.sql); got != tt.want {
				t.Errorf("getDistributedSubTableName() = %v, want %v", got, tt.want)
			}
		})
	}
}
