package clickhouse

import (
	"database/sql"
	"fmt"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/core/common"
	"github.com/clickvisual/clickvisual/api/core/switcher/ifswitcher"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
)

var _ ifswitcher.Switcher = (*Switcher)(nil)

type Switcher struct {
	createType int

	isShard   bool   // isShard Does it include shard
	isReplica bool   // isReplica Does it include replica
	cluster   string // cluster name
	database  string // database name
	table     string // table name

	conn *sql.DB // clickhouse instance

	rawLogField  string
	parseIndexes string
	parseFields  string
	parseTime    string
	parseWhere   string
}

func NewSwitcher(req ifswitcher.Params) *Switcher {
	return &Switcher{
		createType:   req.CreateType,
		isShard:      req.IsShard,
		isReplica:    req.IsReplica,
		cluster:      req.Cluster,
		database:     req.Database,
		table:        req.Table,
		conn:         req.Conn,
		rawLogField:  req.RawLogField,
		parseIndexes: req.ParseIndexes,
		parseFields:  req.ParseFields,
		parseTime:    req.ParseTime,
		parseWhere:   req.ParseWhere,
	}
}

func (ch *Switcher) Description() string {
	return "switcher_clickhouse"
}

func (ch *Switcher) Create() (tables []string, sqls []string, err error) {
	tables = make([]string, 0)
	sqls = make([]string, 0)
	switch ch.createType {
	case constx.TableCreateTypeJSONEachRow:
		// todo nothing, wait for implementation
	case constx.TableCreateTypeJSONAsString:
		tables, sqls = ch.createJSONAsString()
	default:
		return tables, sqls, errors.New("clickhouse reader type not supported")
	}
	err = common.Exec(ch.conn, sqls)
	return
}

func (ch *Switcher) createJSONAsString() (names []string, sqls []string) {
	names = make([]string, 0)
	sqls = make([]string, 0)
	common.AppendSQL(&names, &sqls, ch.materializedView)
	return
}

func (ch *Switcher) materializedView() (name string, sql string) {
	var dataName string
	streamName := fmt.Sprintf("`%s`.`%s_stream`", ch.database, ch.table)
	var viewNameWithCluster string
	viewName := fmt.Sprintf("`%s`.`%s_view`", ch.database, ch.table)
	if ch.isReplica || ch.isShard {
		dataName = fmt.Sprintf("`%s`.`%s_local`", ch.database, ch.table)
		viewNameWithCluster = fmt.Sprintf("%s on cluster '%s'", viewName, ch.cluster)
	} else {
		dataName = fmt.Sprintf("`%s`.`%s`", ch.database, ch.table)
		viewNameWithCluster = viewName
	}
	return viewName, fmt.Sprintf(`CREATE MATERIALIZED VIEW IF NOT EXISTS  %s TO %s AS
SELECT
%s
%s,
_key AS _key,
%s,
toString(JSONExtractRaw(_log, '%s')) AS _raw_log_%s
FROM %s
WHERE %s;
`, viewNameWithCluster, dataName, ch.parseFields, ch.parseTime, "`_headers.name` AS `_headersname`,\n`_headers.value` AS `_headersvalue`",
		ch.rawLogField, ch.parseIndexes, streamName, ch.parseWhere)
}

func (ch *Switcher) Delete() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Switcher) Detach() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Switcher) Attach() error {
	// TODO implement me
	panic("implement me")
}
