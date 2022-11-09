package standalone

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/common"
)

// DataBuilder stand-alone cluster version
// _time_ version string/float is the same sql, so we use the same data builder to finish the job.
type DataBuilder struct {
	QueryAssembly *bumo.QueryAssembly
}

func (b *DataBuilder) NewProject(params bumo.Params) {
	b.QueryAssembly = new(bumo.QueryAssembly)
	b.QueryAssembly.Params = params
}

func (b *DataBuilder) BuilderCreate() {
	b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s\n", b.QueryAssembly.Params.Data.TableName)
}

func (b *DataBuilder) BuilderFields() {
	b.QueryAssembly.Result += common.BuilderFieldsData(b.QueryAssembly.Params.TableCreateType, b.QueryAssembly.Params.KafkaJsonMapping)
}

func (b *DataBuilder) BuilderWhere() {
}

func (b *DataBuilder) BuilderEngine() {
	b.QueryAssembly.Result += "ENGINE = MergeTree\nPARTITION BY toYYYYMMDD(_time_second_)\n"
}

func (b *DataBuilder) BuilderOrder() {
	b.QueryAssembly.Result += "ORDER BY _time_second_\n"
}

func (b *DataBuilder) BuilderTTL() {
	b.QueryAssembly.Result += fmt.Sprintf("TTL toDateTime(_time_second_) + INTERVAL %d DAY\n", b.QueryAssembly.Params.Data.Days)
}

func (b *DataBuilder) BuilderSetting() {
	b.QueryAssembly.Result += "SETTINGS index_granularity = 8192\n\n"
}

func (b *DataBuilder) GetResult() interface{} { return b.QueryAssembly }
