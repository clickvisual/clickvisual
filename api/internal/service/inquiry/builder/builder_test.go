package builder

import (
	"testing"

	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/standalone"
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
			name: "test-1",
			args: args{
				builder: new(standalone.DataBuilder),
				params: bumo.Params{
					TableName:   "dev.app_stdout",
					Days:        3,
					TimeTyp:     "",
					Brokers:     "",
					Topic:       "",
					Group:       "",
					ConsumerNum: 0,
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
ENGINE = MergeTree PARTITION BY toYYYYMMDD(_time_second_)
ORDER BY _time_second_
TTL toDateTime(_time_second_) + INTERVAL 3 DAY
SETTINGS index_granularity = 8192;`,
		}, {
			name: "test-2",
			args: args{
				builder: new(standalone.StreamBuilder),
				params: bumo.Params{
					TableName:   "dev.app_stdout_stream",
					Days:        3,
					TimeTyp:     "String", // 1 string 2 float
					Brokers:     "kafka:9092",
					Topic:       "topic",
					Group:       "app_stdout",
					ConsumerNum: 1,
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
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Standalone(tt.args.params, tt.args.builder); got != tt.want {
				t.Errorf("StandaloneData() = %v, want %v", got, tt.want)
			}
		})
	}
}
