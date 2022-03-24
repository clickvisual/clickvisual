package standalone

import (
	"fmt"

	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
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
	b.QueryAssembly.Create = fmt.Sprintf("CREATE TABLE %s\n", b.QueryAssembly.Params.TableName)
}

func (b *DataBuilder) BuilderFields() {
	b.QueryAssembly.Fields = `(
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
`
}

func (b *DataBuilder) BuilderWhere() {
}

func (b *DataBuilder) BuilderEngine() {
	b.QueryAssembly.Engine = "ENGINE = MergeTree PARTITION BY toYYYYMMDD(_time_second_)\n"
}

func (b *DataBuilder) BuilderOrder() {
	b.QueryAssembly.Order = "ORDER BY _time_second_\n"
}

func (b *DataBuilder) BuilderTTL() {
	b.QueryAssembly.TTL = fmt.Sprintf("TTL toDateTime(_time_second_) + INTERVAL %d DAY\n", b.QueryAssembly.Params.Days)
}

func (b *DataBuilder) BuilderSetting() {
	b.QueryAssembly.Setting = "SETTINGS index_granularity = 8192\n"
}

func (b *DataBuilder) GetResult() interface{} { return b.QueryAssembly }
