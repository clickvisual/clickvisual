package builderv2

import (
	"fmt"
)

var _ IStorageCreator = (*TraceCal)(nil)

type TraceCal struct {
	Storage
}

func newTraceCal() IStorageCreator {
	return &TraceCal{}
}

// GetDistributedSQL get distribution table sql
func (t *TraceCal) GetDistributedSQL() (string, bool) {
	if t.isReplica || t.isShard {
		// ddn distribution database table name
		ddt := fmt.Sprintf("`%s`.`%s`", t.database, t.table)
		// mdt merge tree database table
		mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
		// Contains the shard or include a copy of the return distribution table sql
		return fmt.Sprintf(`CREATE TABLE %s on cluster '%s' AS %s
ENGINE = Distributed('%s', '%s', '%s_local', rand());`, ddt, t.cluster, mdt, t.cluster, t.database, t.table), true
	}
	return defaultMsg, false
}

func (t *TraceCal) GetMergeTreeSQL() (string, bool) {
	if t.isShard {
		return t.mergeTreeShardSQL(), true
	}
	if t.isReplica {
		return t.mergeTreeReplicaSQL(), true
	}
	return t.mergeTreeSQL(), true
}

func (t *TraceCal) GetKafkaEngineSQL() (string, bool) {
	return defaultMsg, false
}

func (t *TraceCal) GetMaterializeViewSQL() (string, bool) {
	return defaultMsg, false
}

func (t *TraceCal) mergeTreeShardSQL() string {
	// mdt merge tree database table
	mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
	return fmt.Sprintf(`CREATE TABLE %s on cluster '%s'
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

func (t *TraceCal) mergeTreeReplicaSQL() string {
	// mdt merge tree database table
	mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
	return fmt.Sprintf(`CREATE TABLE %s on cluster '%s'
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

func (t *TraceCal) mergeTreeSQL() string {
	// mdt merge tree database table
	mdt := fmt.Sprintf("`%s`.`%s`", t.database, t.table)
	return fmt.Sprintf(`CREATE TABLE %s
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
