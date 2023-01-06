package builderv2

import (
	"fmt"
)

var _ IStorageCreator = (*ComputeTrace)(nil)

// ComputeTrace Link data calculation
type ComputeTrace struct {
	Storage
}

func newComputeTrace() IStorageCreator {
	return &ComputeTrace{}
}

func (t *ComputeTrace) GetSQLs() (names []string, sqls []string) {
	names = make([]string, 0)
	sqls = make([]string, 0)
	appendSQL(&names, &sqls, t.getDistributedSQL)
	appendSQL(&names, &sqls, t.getMergeTreeSQL)
	return
}

// GetDistributedSQL get distribution table sql
func (t *ComputeTrace) getDistributedSQL() (name string, sql string) {
	if t.isReplica || t.isShard {
		// ddn distribution database table name
		ddt := fmt.Sprintf("`%s`.`%s`", t.database, t.table)
		// mdt merge tree database table
		mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
		// Contains the shard or include a copy of the return distribution table sql
		return ddt, fmt.Sprintf(`CREATE TABLE %s on cluster '%s' AS %s
ENGINE = Distributed('%s', '%s', '%s_local', rand());`, ddt, t.cluster, mdt, t.cluster, t.database, t.table)
	}
	return "", ""
}

func (t *ComputeTrace) getMergeTreeSQL() (name string, sql string) {
	if t.isShard {
		return t.mergeTreeShardSQL()
	}
	if t.isReplica {
		return t.mergeTreeReplicaSQL()
	}
	return t.mergeTreeSQL()
}

func (t *ComputeTrace) mergeTreeShardSQL() (name string, sql string) {
	// mdt merge tree database table
	mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
	return mdt, fmt.Sprintf(`CREATE TABLE %s on cluster '%s'
(
    timestamp           DateTime,
    parent              String,
    child               String,
    call_count          UInt64,
    server_duration_p50 Float64,
    server_duration_p90 Float64,
    server_duration_p99 Float64,
    client_duration_p50 Float64,
    client_duration_p90 Float64,
    client_duration_p99 Float64,
    server_success_rate Float64,
    client_success_rate Float64,
    time                DateTime
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/%s.%s_local/{shard}', '{replica}')
PARTITION BY toDate(timestamp)
ORDER BY (timestamp, parent, child)
TTL toDate(timestamp) + INTERVAL %d DAY
SETTINGS index_granularity = 8192;`, mdt, t.cluster, t.database, t.table, t.ttl)
}

func (t *ComputeTrace) mergeTreeReplicaSQL() (name string, sql string) {
	// mdt merge tree database table
	mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
	return mdt, fmt.Sprintf(`CREATE TABLE %s on cluster '%s'
(
    timestamp           DateTime,
    parent              String,
    child               String,
    call_count          UInt64,
    server_duration_p50 Float64,
    server_duration_p90 Float64,
    server_duration_p99 Float64,
    client_duration_p50 Float64,
    client_duration_p90 Float64,
    client_duration_p99 Float64,
    server_success_rate Float64,
    client_success_rate Float64,
    time                DateTime
)
ENGINE = MergeTree
PARTITION BY toDate(timestamp)
ORDER BY (timestamp, parent, child)
TTL toDate(timestamp) + INTERVAL %d DAY
SETTINGS index_granularity = 8192;`, mdt, t.cluster, t.ttl)
}

func (t *ComputeTrace) mergeTreeSQL() (name string, sql string) {
	// mdt merge tree database table
	mdt := fmt.Sprintf("`%s`.`%s`", t.database, t.table)
	return mdt, fmt.Sprintf(`CREATE TABLE %s
(
    timestamp           DateTime,
    parent              String,
    child               String,
    call_count          UInt64,
    server_duration_p50 Float64,
    server_duration_p90 Float64,
    server_duration_p99 Float64,
    client_duration_p50 Float64,
    client_duration_p90 Float64,
    client_duration_p99 Float64,
    server_success_rate Float64,
    client_success_rate Float64,
    time                DateTime
)
ENGINE = MergeTree
PARTITION BY toDate(timestamp)
ORDER BY (timestamp, parent, child)
TTL toDate(timestamp) + INTERVAL %d DAY
SETTINGS index_granularity = 8192;`, mdt, t.ttl)
}
