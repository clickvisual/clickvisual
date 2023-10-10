package cluster

import (
	"fmt"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory/builder/common"
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
		b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s on cluster '%s' AS %s\n",
			b.QueryAssembly.Params.Data.TableName, b.QueryAssembly.Params.Cluster, b.QueryAssembly.Params.Data.SourceTable)
	default:
		b.QueryAssembly.Result += fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s on cluster '%s'\n",
			b.QueryAssembly.Params.Data.TableName, b.QueryAssembly.Params.Cluster)
	}
}

func (b *DataBuilder) BuilderFields() {
	switch b.QueryAssembly.Params.Data.DataType {
	case bumo.DataTypeDistributed:
	default:
		b.QueryAssembly.Result += common.BuilderFieldsData(b.QueryAssembly.Params.KafkaJsonMapping)
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
		b.QueryAssembly.Result += builderEngineByReplicaStatus(b.QueryAssembly.Params.ReplicaStatus, b.QueryAssembly.Params.Data.TableName)
	}
}

func builderEngineByReplicaStatus(rs int, tableName string) string {
	engineSQL := fmt.Sprintf("ENGINE = ReplicatedMergeTree('/clickhouse/tables/%s/{shard}', '{replica}')\nPARTITION BY toYYYYMMDD(_time_second_)\n",
		strings.ReplaceAll(tableName, "`", ""))
	switch rs {
	case bumo.ReplicaStatusYes:
		return engineSQL
	case bumo.ReplicaStatusNo:
		return "ENGINE = MergeTree PARTITION BY toYYYYMMDD(_time_second_)\n"
	default:
		return engineSQL
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
		b.QueryAssembly.Result += "SETTINGS index_granularity = 8192\n\n"
	}
}

func (b *DataBuilder) GetResult() interface{} { return b.QueryAssembly }
