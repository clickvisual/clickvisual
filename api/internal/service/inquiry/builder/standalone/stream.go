package standalone

import (
	"fmt"

	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
)

// StreamBuilder stand-alone cluster version
type StreamBuilder struct {
	QueryAssembly *bumo.QueryAssembly
}

func (b *StreamBuilder) NewProject(params bumo.Params) {
	b.QueryAssembly = new(bumo.QueryAssembly)
	b.QueryAssembly.Params = params
}

func (b *StreamBuilder) BuilderCreate() {
	b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE %s\n", b.QueryAssembly.Params.Stream.TableName)
}

func (b *StreamBuilder) BuilderFields() {
	b.QueryAssembly.Result += fmt.Sprintf(`(
  _source_ String,
  _pod_name_ String,
  _namespace_ String,
  _node_name_ String,
  _container_name_ String,
  _cluster_ String,
  _log_agent_ String,
  _node_ip_ String,
  _time_ %s,
  _log_ String
)
`, b.QueryAssembly.Params.Stream.TimeTyp)
}

func (b *StreamBuilder) BuilderWhere() {
}

func (b *StreamBuilder) BuilderEngine() {
	b.QueryAssembly.Result += fmt.Sprintf("ENGINE = Kafka SETTINGS kafka_broker_list = '%s', kafka_topic_list = '%s', kafka_group_name = '%s', kafka_format = 'JSONEachRow', kafka_num_consumers = %d\n",
		b.QueryAssembly.Params.Stream.Brokers, b.QueryAssembly.Params.Stream.Topic,
		b.QueryAssembly.Params.Stream.Group, b.QueryAssembly.Params.Stream.ConsumerNum)
}

func (b *StreamBuilder) BuilderOrder() {}

func (b *StreamBuilder) BuilderTTL() {}

func (b *StreamBuilder) BuilderSetting() {}

func (b *StreamBuilder) GetResult() interface{} { return b.QueryAssembly }
