package cluster

import (
	"fmt"
	"strings"

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
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
		b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE %s on cluster '%s' AS %s\n",
			b.QueryAssembly.Params.Data.TableName, b.QueryAssembly.Params.Cluster, b.QueryAssembly.Params.Data.SourceTable)
	default:
		b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE %s on cluster '%s'\n",
			b.QueryAssembly.Params.Data.TableName, b.QueryAssembly.Params.Cluster)
	}
}

func (b *DataBuilder) BuilderFields() {
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
	default:
		b.QueryAssembly.Result += `(
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
}

func (b *DataBuilder) BuilderWhere() {
}

func (b *DataBuilder) BuilderEngine() {
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
		arr := strings.Split(b.QueryAssembly.Params.Data.SourceTable, ".")
		if len(arr) != 2 {
			return
		}
		b.QueryAssembly.Result += fmt.Sprintf("ENGINE = Distributed('%s', '%s', '%s', rand())",
			b.QueryAssembly.Params.Cluster,
			strings.ReplaceAll(arr[0], "`", ""),
			strings.ReplaceAll(arr[1], "`", ""))
	default:
		b.QueryAssembly.Result += fmt.Sprintf("ENGINE = ReplicatedMergeTree('/clickhouse/tables/%s/{shard}', '{replica}')\nPARTITION BY toYYYYMMDD(_time_second_)\n",
			strings.ReplaceAll(b.QueryAssembly.Params.Data.TableName, "`", ""))
	}

}

func (b *DataBuilder) BuilderOrder() {
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
	default:
		b.QueryAssembly.Result += "ORDER BY _time_second_\n"
	}
}

func (b *DataBuilder) BuilderTTL() {
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
	default:
		b.QueryAssembly.Result += fmt.Sprintf("TTL toDateTime(_time_second_) + INTERVAL %d DAY\n", b.QueryAssembly.Params.Data.Days)
	}
}

func (b *DataBuilder) BuilderSetting() {
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
	default:
		b.QueryAssembly.Result += "SETTINGS index_granularity = 8192\n"
	}
}

func (b *DataBuilder) GetResult() interface{} { return b.QueryAssembly }
