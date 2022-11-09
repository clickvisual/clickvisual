package cluster

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
	b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s on cluster '%s' \n",
		b.QueryAssembly.Params.Stream.TableName, b.QueryAssembly.Params.Cluster)
}

func (b *StreamBuilder) BuilderFields() {
	b.QueryAssembly.Result += common.BuilderFieldsStream(b.QueryAssembly.Params.TableCreateType, b.QueryAssembly.Params.KafkaJsonMapping,
		b.QueryAssembly.Params.TimeField,
		b.QueryAssembly.Params.Stream.TableTyp,
		b.QueryAssembly.Params.LogField,
	)
}

func (b *StreamBuilder) BuilderWhere() {
}

func (b *StreamBuilder) BuilderEngine() {
	b.QueryAssembly.Result += common.BuilderEngineStream(b.QueryAssembly.Params.TableCreateType, b.QueryAssembly.Params.Stream)
}

func (b *StreamBuilder) BuilderOrder() {}

func (b *StreamBuilder) BuilderTTL() {}

func (b *StreamBuilder) BuilderSetting() {}

func (b *StreamBuilder) GetResult() interface{} { return b.QueryAssembly }
