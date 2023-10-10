package builderv2

import (
	"fmt"
)

var _ IStorageCreator = (*BufferNullDataPipe)(nil)

// BufferNullDataPipe Link data calculation
type BufferNullDataPipe struct {
	Storage
}

func newBuffNullDataPipe() IStorageCreator {
	return &BufferNullDataPipe{}
}

func (t *BufferNullDataPipe) GetSQLs() (names []string, sqls []string) {
	names = make([]string, 0)
	sqls = make([]string, 0)
	appendSQL(&names, &sqls, t.sqlNull)
	appendSQL(&names, &sqls, t.sqlBuffer)
	appendSQL(&names, &sqls, t.sqlDataTable)
	appendSQL(&names, &sqls, t.sqlMaterializedView)
	appendSQL(&names, &sqls, t.sqlDistributed)
	return
}

// sqlDistributed get distribution table sql
func (t *BufferNullDataPipe) sqlDistributed() (name string, sql string) {
	if t.isReplica || t.isShard {
		// ddn distribution database table name
		ddt := fmt.Sprintf("`%s`.`%s`", t.database, t.table)
		// mdt merge tree database table
		mdt := fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
		// Contains the shard or include a copy of the return distribution table sql
		return ddt, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS  %s on cluster '%s' AS %s
ENGINE = Distributed('%s', '%s', '%s_local', rand());`, ddt, t.cluster, mdt, t.cluster, t.database, t.table)
	}
	return "", ""
}

func (t *BufferNullDataPipe) sqlMaterializedView() (name string, sql string) {
	var dataName string
	nullName := fmt.Sprintf("`%s`.`%s_null`", t.database, t.table)
	var viewNameWithCluster string
	viewName := fmt.Sprintf("`%s`.`%s_view`", t.database, t.table)
	if t.isReplica || t.isShard {
		dataName = fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
		viewNameWithCluster = fmt.Sprintf("%s on cluster '%s'", viewName, t.cluster)
	} else {
		dataName = fmt.Sprintf("`%s`.`%s`", t.database, t.table)
		viewNameWithCluster = viewName
	}
	return viewName, fmt.Sprintf(`CREATE MATERIALIZED VIEW IF NOT EXISTS  %s TO %s AS
SELECT
    toDateTime(toInt64(_timestamp)) AS _time_second_,
    toDateTime64(toInt64(_timestamp), 9) AS _time_nanosecond_,
    _log AS _raw_log_
FROM %s;
`, viewNameWithCluster, dataName, nullName)
}

func (t *BufferNullDataPipe) sqlDataTable() (name string, sql string) {
	var engine string
	var tableNameWithCluster string
	tableName := fmt.Sprintf("`%s`.`%s`", t.database, t.table)
	if t.isReplica || t.isShard {
		tableName = fmt.Sprintf("`%s`.`%s_local`", t.database, t.table)
		tableNameWithCluster = fmt.Sprintf("%s on cluster '%s'", tableName, t.cluster)
		engine = fmt.Sprintf("ENGINE = ReplicatedMergeTree('/clickhouse/tables/%s.%s_local/{shard}', '{replica}')", t.database, t.table)
	} else {
		tableNameWithCluster = tableName
		engine = "ENGINE = MergeTree"
	}
	return tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s
(
    _time_second_ DateTime,
    _time_nanosecond_ DateTime64(9),
    _raw_log_ String CODEC(ZSTD(1)),
    INDEX idx_raw_log _raw_log_ TYPE tokenbf_v1(30720, 2, 0) GRANULARITY 1
)
%s
PARTITION BY toYYYYMMDD(_time_second_)
ORDER BY _time_second_
TTL toDateTime(_time_second_) + INTERVAL %d DAY
SETTINGS index_granularity = 8192;
`, tableNameWithCluster, engine, t.ttl)
}

func (t *BufferNullDataPipe) sqlBuffer() (name string, sql string) {
	var bufferNameWithCluster string
	bufferName := fmt.Sprintf("`%s`.`%s_buffer`", t.database, t.table)
	nullName := fmt.Sprintf("`%s`.`%s_null`", t.database, t.table)
	if t.isReplica || t.isShard {
		bufferNameWithCluster = fmt.Sprintf("%s on cluster '%s'", bufferName, t.cluster)
	} else {
		bufferNameWithCluster = bufferName
	}
	return bufferName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s AS %s
ENGINE = Buffer(%s, %s_null, 16, 10, 100, 10000, 1000000, 10000000, 100000000)`, bufferNameWithCluster, nullName, t.database, t.table)
}

func (t *BufferNullDataPipe) sqlNull() (name string, sql string) {
	var nullNameWithCluster string
	nullName := fmt.Sprintf("`%s`.`%s_null`", t.database, t.table)
	if t.isReplica || t.isShard {
		nullNameWithCluster = fmt.Sprintf("%s on cluster '%s'", nullName, t.cluster)
	} else {
		nullNameWithCluster = nullName
	}
	return nullName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s
(
    _timestamp Int64,
    _log String
)
engine = Null;`, nullNameWithCluster)
}
