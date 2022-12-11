package inquiry

import (
	"context"
	"database/sql"
	"strconv"
	"strings"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	TableTypeString = 1
	TableTypeFloat  = 2
)

var (
	queryOperatorArr = []string{"=", "!=", "<", "<=", ">", ">=", "like"}
)

type Operator interface {
	Conn() *sql.DB
	Chart(view.ReqQuery) ([]*view.HighChart, string, error)
	Count(view.ReqQuery) (uint64, error)
	GroupBy(view.ReqQuery) map[string]uint64
	DoSQL(string) (view.RespComplete, error)
	Prepare(view.ReqQuery, bool) (view.ReqQuery, error)
	SyncView(db.BaseTable, *db.BaseView, []*db.BaseView, bool) (string, string, error)

	CreateDatabase(string, string) error
	CreateAlertView(string, string, string) error
	CreateKafkaTable(*db.BaseTable, view.ReqStorageUpdate) (string, error)
	CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error)
	CreateTable(int, db.BaseDatabase, view.ReqTableCreate) (string, string, string, string, error)
	CreateStorage(int, db.BaseDatabase, view.ReqStorageCreate) (string, string, string, string, error)
	CreateStorageV3(int, db.BaseDatabase, view.ReqStorageCreateV3) (string, string, string, string, error)
	CreateMetricsSamples(cluster string) error
	CreateBufferNullDataPipe(req db.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error)

	UpdateIndex(db.BaseDatabase, db.BaseTable, map[string]*db.BaseIndex, map[string]*db.BaseIndex, map[string]*db.BaseIndex) error
	UpdateMergeTreeTable(*db.BaseTable, view.ReqStorageUpdate) error

	GetLogs(view.ReqQuery, int) (view.RespQuery, error)
	GetCreateSQL(database, table string) (string, error)
	GetAlertViewSQL(*db.Alarm, db.BaseTable, int, *view.AlarmFilterItem) (string, string, error)
	GetTraceGraph(ctx context.Context) ([]view.RespJaegerDependencyDataModel, error)
	GetMetricsSamples() error

	ListSystemTable() []*view.SystemTables
	ListSystemCluster() ([]*view.SystemClusters, map[string]*view.SystemClusters, error)
	ListDatabase() ([]*view.RespDatabaseSelfBuilt, error)
	ListColumn(string, string, bool) ([]*view.RespColumn, error)

	DeleteDatabase(string, string) error
	DeleteAlertView(string, string) error
	DeleteTable(string, string, string, int) error
	DeleteTraceJaegerDependencies(database, cluster, table string) (err error)
}

func TagsToString(alarm *db.Alarm, withQuote bool, filterId int) string {
	tags := alarm.Tags
	if alarm.Tags == nil || len(alarm.Tags) == 0 {
		tags = make(map[string]string, 0)
	}
	tags["uuid"] = alarm.Uuid
	tags["alarmId"] = strconv.Itoa(alarm.ID)
	result := make([]string, 0)
	for k, v := range tags {
		result = resultAppend(result, k, v, withQuote)
	}
	if filterId != 0 {
		result = resultAppend(result, "filterId", strconv.Itoa(filterId), withQuote)
	}
	return strings.Join(result, ",")
}
