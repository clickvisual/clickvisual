package builderv2

import (
	"database/sql"
	"errors"

	"github.com/clickvisual/clickvisual/api/pkg/constx"
)

var (
	ErrorCreateType = errors.New("create type error")
)

var (
	defaultValue []string
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

	// GetSQLs get distribution table sql
	GetSQLs() (names []string, sqls []string)

	// Execute SQL and return the results
	Execute([]string) (string, error)
}

// GetTableCreator Through specific types of logging library access to build table objects,
// obtain four different SQL statements on the basis of the process to create
func GetTableCreator(cType int) (IStorageCreator, error) {
	switch cType {
	case constx.TableCreateTypeTraceCalculation:
		return newComputeTrace(), nil
	case constx.TableCreateTypeBufferNullDataPipe:
		return newBuffNullDataPipe(), nil
	}
	return nil, ErrorCreateType
}

type generateSQL func() (name string, sql string)

func appendSQL(names, sqls *[]string, opt generateSQL) {
	n, s := opt()
	if n != "" {
		*names = append(*names, n)
	}
	if s != "" {
		*sqls = append(*sqls, s)
	}
}

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

func (t *Storage) GetSQLs() ([]string, []string) {
	return defaultValue, defaultValue
}

func (t *Storage) Execute(sqls []string) (string, error) {
	for _, sq := range sqls {
		if sq == "" {
			continue
		}
		if _, err := t.db.Exec(sq); err != nil {
			return sq, err
		}
	}
	return "", nil
}
