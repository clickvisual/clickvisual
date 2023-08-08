package clickhouse

import (
	"database/sql"
	"fmt"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/core/common"
	"github.com/clickvisual/clickvisual/api/core/storer/ifstorer"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
)

var _ ifstorer.Storer = (*Storer)(nil)

type Storer struct {
	createType int

	isShard   bool   // isShard Does it include shard
	isReplica bool   // isReplica Does it include replica
	cluster   string // cluster name
	database  string // database name
	table     string // table name

	conn *sql.DB // clickhouse instance

	fields           string
	ttl              int  // ttl Data expiration time, unit is the day
	withAttachFields bool // withAttachFields Whether to include attachment fields, such as _key/headers
}

func NewStorer(req ifstorer.Params) *Storer {
	return &Storer{
		createType: req.CreateType,
		isShard:    req.IsShard,
		isReplica:  req.IsReplica,
		cluster:    req.Cluster,
		database:   req.Database,
		table:      req.Table,
		ttl:        req.TTL,
		conn:       req.Conn,
		fields:     req.Fields,
	}
}

func (ch *Storer) Description() string {
	return "storer_clickhouse"
}

func (ch *Storer) Create() (names []string, sqls []string, err error) {
	names = make([]string, 0)
	sqls = make([]string, 0)
	switch ch.createType {
	case constx.TableCreateTypeJSONEachRow:
		// todo nothing, wait for implementation
	case constx.TableCreateTypeJSONAsString:
		// 创建数据落地表，包括分布式表和存储表
		names, sqls = ch.createJSONAsString()
		// 创建 cv 分析字段映射
	default:
		return names, sqls, errors.New("clickhouse reader type not supported")
	}
	err = common.Exec(ch.conn, sqls)
	return
}

func (ch *Storer) createJSONAsString() (names []string, sqls []string) {
	names = make([]string, 0)
	sqls = make([]string, 0)
	common.AppendSQL(&names, &sqls, ch.mergeTreeTable)
	common.AppendSQL(&names, &sqls, ch.distributedTable)
	return
}

func (ch *Storer) mergeTreeTable() (name string, sql string) {
	var engine string
	var tableNameWithCluster string
	tableName := fmt.Sprintf("`%s`.`%s`", ch.database, ch.table)
	engine = "ENGINE = MergeTree"
	if ch.isReplica || ch.isShard {
		tableName = fmt.Sprintf("`%s`.`%s_local`", ch.database, ch.table)
		tableNameWithCluster = fmt.Sprintf("%s on cluster '%s'", tableName, ch.cluster)
		if ch.isReplica {
			engine = fmt.Sprintf("ENGINE = ReplicatedMergeTree('/clickhouse/tables/%s.%s_local/{shard}', '{replica}')", ch.database, ch.table)
		}
	} else {
		tableNameWithCluster = tableName
	}
	if ch.withAttachFields {
		return tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s
(
  %s
  _time_second_ DateTime,
  _time_nanosecond_ DateTime64(9),
  _raw_log_ String CODEC(ZSTD(1)),
  _key String CODEC(ZSTD(1)),
  %s Array(String),
  %s Array(String),
  INDEX idx_raw_log _raw_log_ TYPE tokenbf_v1(30720, 2, 0) GRANULARITY 1
)
%s
PARTITION BY toYYYYMMDD(_time_second_)
ORDER BY _time_second_
TTL toDateTime(_time_second_) + INTERVAL %d DAY
SETTINGS index_granularity = 8192;
`, tableNameWithCluster, ch.fields, "`_headers_name`", "`_headers_value`", engine, ch.ttl)
	}
	return tableName, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s
(
  %s
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
`, tableNameWithCluster, ch.fields, engine, ch.ttl)
}

func (ch *Storer) distributedTable() (name string, sql string) {
	if ch.isReplica || ch.isShard {
		// ddn distribution database table name
		ddt := fmt.Sprintf("`%s`.`%s`", ch.database, ch.table)
		// mdt merge tree database table
		mdt := fmt.Sprintf("`%s`.`%s_local`", ch.database, ch.table)
		// Contains the shard or include a copy of the return distribution table sql
		return ddt, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS  %s on cluster '%s' AS %s
ENGINE = Distributed('%s', '%s', '%s_local', rand());`, ddt, ch.cluster, mdt, ch.cluster, ch.database, ch.table)
	}
	return "", ""
}

func (ch *Storer) Delete() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Storer) Detach() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Storer) Attach() error {
	// TODO implement me
	panic("implement me")
}
