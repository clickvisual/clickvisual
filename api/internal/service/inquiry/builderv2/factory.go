package builderv2

import (
	"database/sql"
	"errors"
)

const (
	// StorageTypeTraceCal Used to store using jaegerJson format otel trace data calculation results
	StorageTypeTraceCal = "trace_calculate"
)

var (
	ErrorStorageType = errors.New("storage type error")
)

var (
	defaultMsg = "Hello, world!"
)

type Params struct {
	IsShard   bool // isShard Does it include shard
	IsReplica bool // isReplica Does it include replica

	Cluster  string // cluster name
	Database string // database name
	Table    string // table name

	TTL int // ttl Data expiration time, unit is the day

	DB *sql.DB // clickhouse instance
}

type IStorageCreator interface {

	// SetParams Initialization parameter
	SetParams(Params)

	// GetDistributedSQL get distribution table sql
	GetDistributedSQL() (string, bool)

	// GetMergeTreeSQL get mergeTree table sql
	GetMergeTreeSQL() (string, bool)

	// GetKafkaEngineSQL get kafka engine table sql
	GetKafkaEngineSQL() (string, bool)

	// GetMaterializeViewSQL get materialized view table sql
	GetMaterializeViewSQL() (string, bool)

	// Execute SQL and return the results
	Execute(string, bool) (string, error)
}

// GetTableCreator Through specific types of logging library access to build table objects,
// obtain four different SQL statements on the basis of the process to create
func GetTableCreator(storageType string) (IStorageCreator, error) {
	switch storageType {
	case StorageTypeTraceCal:
		return newTraceCal(), nil
	}
	return nil, ErrorStorageType
}
