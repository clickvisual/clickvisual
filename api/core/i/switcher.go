package i

import (
	"database/sql"
)

type Switcher interface {
	// Description read model
	Description() string

	Create() (tables []string, sqls []string, err error)
	Delete() error
	Detach() error
	Attach() error
}

type SwitcherParams struct {
	// common
	CreateType int

	IsShard   bool    // isShard Does it include shard
	IsReplica bool    // isReplica Does it include replica
	Cluster   string  // cluster name
	Database  string  // database name
	Table     string  // table name
	Conn      *sql.DB // clickhouse

	// switcher
	RawLogField         string
	RawLogFieldParent   string
	ParseIndexes        string
	ParseFields         string
	ParseTime           string
	ParseWhere          string
	IsRawLogFieldString bool
	CustomTimeField     string
}
