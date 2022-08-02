package standalone

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/common"
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
	b.QueryAssembly.Result += common.BuilderFieldsStream(b.QueryAssembly.Params.KafkaJsonMapping,
		b.QueryAssembly.Params.TimeField,
		b.QueryAssembly.Params.Stream.TimeTyp,
		b.QueryAssembly.Params.LogField,
	)
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
