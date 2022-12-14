package builderv2

import (
	"database/sql"
)

var _ IStorageCreator = (*Storage)(nil)

type Storage struct {
	isShard   bool // isShard Does it include shard
	isReplica bool // isReplica Does it include replica

	cluster  string // cluster name
	database string // database name
	table    string // table name

	ttl int // ttl Data expiration time, unit is the day

	db *sql.DB // clickhouse instance
}

func (t *Storage) SetParams(req Params) {
	t.isShard = req.IsShard
	t.isReplica = req.IsReplica
	t.cluster = req.Cluster
	t.database = req.Database
	t.table = req.Table
	t.ttl = req.TTL
	t.db = req.DB
}

func (t *Storage) GetDistributedSQL() (string, bool) {
	return defaultMsg, false
}

func (t *Storage) GetMergeTreeSQL() (string, bool) {
	return defaultMsg, false
}

func (t *Storage) GetKafkaEngineSQL() (string, bool) {
	return defaultMsg, false
}

func (t *Storage) GetMaterializeViewSQL() (string, bool) {
	return defaultMsg, false
}

func (t *Storage) Execute(sql string, isExec bool) (string, error) {
	if !isExec {
		// no need to execute
		return sql, nil
	}
	if _, err := t.db.Exec(sql); err != nil {
		return sql, err
	}
	return sql, nil
}
