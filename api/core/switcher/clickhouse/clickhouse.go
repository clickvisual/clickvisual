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

	rawLogField         string
	rawLogFieldParent   string
	parseIndexes        string
	parseFields         string
	parseTime           string
	parseWhere          string
	withAttachFields    bool // withAttachFields Whether to include attachment fields, such as _key/headers
	isRawLogFieldString bool // isRawLogFieldJSON Whether the raw log field is JSON
}

func NewSwitcher(req ifswitcher.Params) *Switcher {
	return &Switcher{
		createType:          req.CreateType,
		isShard:             req.IsShard,
		isReplica:           req.IsReplica,
		cluster:             req.Cluster,
		database:            req.Database,
		table:               req.Table,
		conn:                req.Conn,
		rawLogField:         req.RawLogField,
		rawLogFieldParent:   req.RawLogFieldParent,
		parseIndexes:        req.ParseIndexes,
		parseFields:         req.ParseFields,
		parseTime:           req.ParseTime,
		parseWhere:          req.ParseWhere,
		isRawLogFieldString: req.IsRawLogFieldString,
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
	l := "_log"
	if ch.rawLogFieldParent != "" {
		l = fmt.Sprintf("JSONExtractRaw(_log, '%s')", ch.rawLogFieldParent)
	}
	var rawLogFieldCheck = fmt.Sprintf(`FROM 
(
  SELECT
    _log,
    JSONLength(JSONExtractString(%s, '%s')) as len
  FROM %s 
)
WHERE len>0 and`, l, ch.rawLogField, streamName)

	if ch.isRawLogFieldString {
		rawLogFieldCheck = fmt.Sprintf("FROM %s WHERE", streamName)
	}

	if ch.withAttachFields {
		return viewName, fmt.Sprintf(`CREATE MATERIALIZED VIEW IF NOT EXISTS %s TO %s AS
SELECT
%s
%s,
_key AS _key,
%s,
JSONExtractString(%s, '%s') AS _raw_log_%s
%s %s;
`, viewNameWithCluster, dataName, ch.parseFields, ch.parseTime,
			"`_headers.name` AS `_headers_name`,\n`_headers.value` AS `_headers_name`",
			l, ch.rawLogField, ch.parseIndexes, rawLogFieldCheck, ch.parseWhere)
	}
	return viewName, fmt.Sprintf(`CREATE MATERIALIZED VIEW IF NOT EXISTS %s TO %s AS
SELECT
%s
%s,
JSONExtractString(%s, '%s') AS _raw_log_%s
%s %s;
`, viewNameWithCluster, dataName, ch.parseFields, ch.parseTime,
		l, ch.rawLogField, ch.parseIndexes,
		rawLogFieldCheck,
		ch.parseWhere)
}

func (ch *Switcher) Delete() error {
	sqls := make([]string, 0)
	// delete mv table
	viewName := fmt.Sprintf("`%s`.`%s_view`", ch.database, ch.table)
	if ch.isReplica || ch.isShard {
		sqls = append(sqls, fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER %s", viewName, ch.cluster))
	} else {
		sqls = append(sqls, fmt.Sprintf("DROP TABLE IF EXISTS %s", viewName))
	}
	return common.Exec(ch.conn, sqls)
}

func (ch *Switcher) Detach() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Switcher) Attach() error {
	// TODO implement me
	panic("implement me")
}
