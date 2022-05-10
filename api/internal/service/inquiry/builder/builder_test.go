package builder

import (
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/standalone"
)

func TestStandaloneData(t *testing.T) {
	type args struct {
		params  bumo.Params
		builder Builder
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		// TODO: Add test cases.
		{
			name: "test-data",
			args: args{
				builder: new(standalone.DataBuilder),
				params: bumo.Params{
					Data: bumo.ParamsData{
						TableName: "dev.app_stdout",
						Days:      3,
					},
				},
			},
			want: `CREATE TABLE dev.app_stdout
(
  _time_second_ DateTime,
  _time_nanosecond_ DateTime64(9, 'Asia/Shanghai'),
  _source_ String,
  _cluster_ String,
  _log_agent_ String,
  _namespace_ String,
  _node_name_ String,
  _node_ip_ String,
  _container_name_ String,
  _pod_name_ String,
  _raw_log_ String
)
ENGINE = MergeTree
PARTITION BY toYYYYMMDD(_time_second_)
ORDER BY _time_second_
TTL toDateTime(_time_second_) + INTERVAL 3 DAY
SETTINGS index_granularity = 8192;`,
		}, {
			name: "test-stream",
			args: args{
				builder: new(standalone.StreamBuilder),
				params: bumo.Params{
					Stream: bumo.ParamsStream{
						TableName:   "dev.app_stdout_stream",
						TimeTyp:     "String", // 1 string 2 float
						Brokers:     "kafka:9092",
						Topic:       "topic",
						Group:       "app_stdout",
						ConsumerNum: 1,
					},
				},
			},
			want: `CREATE TABLE dev.app_stdout_stream
(
  _source_ String,
  _pod_name_ String,
  _namespace_ String,
  _node_name_ String,
  _container_name_ String,
  _cluster_ String,
  _log_agent_ String,
  _node_ip_ String,
  _time_ String,
  _log_ String
)
ENGINE = Kafka SETTINGS kafka_broker_list = 'kafka:9092', kafka_topic_list = 'topic', kafka_group_name = 'app_stdout', kafka_format = 'JSONEachRow', kafka_num_consumers = 1;`,
		}, {
			name: "test-view",
			args: args{
				builder: new(standalone.ViewBuilder),
				params: bumo.Params{
					View: bumo.ParamsView{
						ViewTable:    "local.test_view",
						TargetTable:  "local.test",
						TimeField:    "parseDateTimeBestEffort(_time_) AS _time_second_,parseDateTimeBestEffort(_time_) AS _time_nanosecond_",
						CommonFields: "",
						SourceTable:  "local.test_stream",
						Where:        "1=1",
					},
				},
			},
			want: `CREATE MATERIALIZED VIEW local.test_view TO local.test AS
SELECT
  parseDateTimeBestEffort(_time_) AS _time_second_,parseDateTimeBestEffort(_time_) AS _time_nanosecond_,
  _source_,
  _cluster_,
  _log_agent_,
  _namespace_,
  _node_name_,
  _node_ip_,
  _container_name_,
  _pod_name_,
  _log_ AS _raw_log_
FROM local.test_stream
WHERE 1=1;`},
		{
			name: "test-view-prometheus",
			args: args{
				builder: new(standalone.ViewBuilder),
				params: bumo.Params{
					View: bumo.ParamsView{
						ViewType:     bumo.ViewTypePrometheusMetric,
						TimeField:    "_time_second_",
						ViewTable:    "dev.f1d937cf_ed7d_4de8_bcba_ce9c8829e5ef",
						CommonFields: "'uuid=f1d937cf-ed7d-4de8-bcba-ce9c8829e5ef'",
						SourceTable:  "dev.ingress_stderr",
						Where:        "1=1",
					},
				},
			},
			want: `CREATE MATERIALIZED VIEW dev.f1d937cf_ed7d_4de8_bcba_ce9c8829e5ef TO metrics.samples AS
SELECT
  toDate(_time_second_) as date,
  'clickvisual_alert_metrics' as name,
  array('uuid=f1d937cf-ed7d-4de8-bcba-ce9c8829e5ef') as tags,
  toFloat64(count(*)) as val,
  _time_second_ as ts,
  toDateTime(_time_second_) as updated
FROM dev.ingress_stderr
WHERE 1=1 GROUP by _time_second_;`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Do(tt.args.builder, tt.args.params); got != tt.want {
				t.Errorf("StandaloneData() = %v, want %v", got, tt.want)
			}
		})
	}
}
