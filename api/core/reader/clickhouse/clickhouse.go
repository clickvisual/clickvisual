package clickhouse

import (
	"database/sql"
	"fmt"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/core/common"
	"github.com/clickvisual/clickvisual/api/core/reader/ifreader"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
)

var _ ifreader.Reader = (*Reader)(nil)

type Reader struct {
	createType int

	isShard   bool   // isShard Does it include shard
	isReplica bool   // isReplica Does it include replica
	cluster   string // cluster name
	database  string // database name
	table     string // table name

	conn *sql.DB // clickhouse instance

	brokers                 string
	topics                  string
	groupName               string
	kafkaNumConsumers       int
	kafkaSkipBrokenMessages int
}

func NewReader(req ifreader.Params) *Reader {
	return &Reader{
		createType:              req.CreateType,
		isShard:                 req.IsShard,
		isReplica:               req.IsReplica,
		cluster:                 req.Cluster,
		database:                req.Database,
		table:                   req.Table,
		conn:                    req.Conn,
		brokers:                 req.Brokers,
		topics:                  req.Topics,
		groupName:               req.GroupName,
		kafkaNumConsumers:       req.KafkaNumConsumers,
		kafkaSkipBrokenMessages: req.KafkaSkipBrokenMessages,
	}
}

func (ch *Reader) Description() string {
	return "reader_clickhouse"
}

func (ch *Reader) Create() (tables []string, sqls []string, err error) {
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

func (ch *Reader) createJSONAsString() (tables []string, sqls []string) {
	readerName := fmt.Sprintf("`%s`.`%s_stream`", ch.database, ch.table)
	if ch.isReplica || ch.isShard {
		readerName = fmt.Sprintf("`%s`.`%s_local_stream` on cluster '%s'", ch.database, ch.table, ch.cluster)
	}

	tables = make([]string, 0)
	tables = append(tables, ch.table)

	sqls = make([]string, 0)
	sqls = append(sqls, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s
(
  _log String
)
ENGINE = Kafka SETTINGS kafka_broker_list = '%s', 
kafka_topic_list = '%s', 
kafka_group_name = '%s', 
kafka_format = 'JSONAsString', 
kafka_num_consumers = %d,
kafka_skip_broken_messages = %d;`, readerName, ch.brokers, ch.topics, ch.table, ch.kafkaNumConsumers, ch.kafkaSkipBrokenMessages))

	return
}

func (ch *Reader) Delete() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Reader) Detach() error {
	// TODO implement me
	panic("implement me")
}

func (ch *Reader) Attach() error {
	// TODO implement me
	panic("implement me")
}
