package inquiry

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/gotomicro/ego/core/econf"

	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
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
	Chart(view2.ReqQuery) ([]*view2.HighChart, string, error)
	Count(view2.ReqQuery) (uint64, error)
	GroupBy(view2.ReqQuery) map[string]uint64
	DoSQL(string) (view2.RespComplete, error)
	Prepare(view2.ReqQuery, bool) (view2.ReqQuery, error)
	SyncView(db2.BaseTable, *db2.BaseView, []*db2.BaseView, bool) (string, string, error)

	CreateDatabase(string, string) error
	CreateAlertView(string, string, string) error
	CreateKafkaTable(*db2.BaseTable, view2.ReqStorageUpdate) (string, error)
	CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error)
	CreateTable(int, db2.BaseDatabase, view2.ReqTableCreate) (string, string, string, string, error)
	CreateStorageJSONAsString(db2.BaseDatabase, view2.ReqStorageCreate) (string, string, string, string, error)
	CreateStorage(int, db2.BaseDatabase, view2.ReqStorageCreate) (string, string, string, string, error)
	CreateMetricsSamples(string) error
	CreateBufferNullDataPipe(req db2.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error)

	UpdateLogAnalysisFields(db2.BaseDatabase, db2.BaseTable, map[string]*db2.BaseIndex, map[string]*db2.BaseIndex, map[string]*db2.BaseIndex) error
	UpdateMergeTreeTable(*db2.BaseTable, view2.ReqStorageUpdate) error

	GetLogs(view2.ReqQuery, int) (view2.RespQuery, error)
	GetCreateSQL(database, table string) (string, error)
	GetAlertViewSQL(*db2.Alarm, db2.BaseTable, int, *view2.AlarmFilterItem) (string, string, error)
	GetTraceGraph(ctx context.Context) ([]view2.RespJaegerDependencyDataModel, error)
	GetMetricsSamples() error
	ClusterInfo() (clusters map[string]dto.ClusterInfo, err error)

	ListSystemTable() []*view2.SystemTables
	ListSystemCluster() ([]*view2.SystemClusters, map[string]*view2.SystemClusters, error)
	ListDatabase() ([]*view2.RespDatabaseSelfBuilt, error)
	ListColumn(string, string, bool) ([]*view2.RespColumn, error)

	DeleteDatabase(string, string) error
	DeleteAlertView(string, string) error
	DeleteTable(string, string, string, int) error
	DeleteTableListByNames([]string, string) error
	DeleteTraceJaegerDependencies(database, cluster, table string) (err error)
	CalculateInterval(interval int64, timeField string) (string, int64)
}

func TagsToString(alarm *db2.Alarm, isMV bool, filterId int) string {
	tags := alarm.Tags
	if alarm.Tags == nil || len(alarm.Tags) == 0 {
		tags = make(map[string]string, 0)
	}
	tags["uuid"] = alarm.Uuid
	tags["alarmId"] = strconv.Itoa(alarm.ID)
	result := make([]string, 0)
	for k, v := range tags {
		result = resultAppend(result, k, v, isMV)
	}
	if filterId != 0 {
		result = resultAppend(result, "filterId", strconv.Itoa(filterId), isMV)
	}
	res := strings.Join(result, ",")
	if isMV && econf.GetString("prom2click.tags") != "" {
		res = fmt.Sprintf("%s,%s", res, econf.GetString("prom2click.tags"))
	}
	return res
}
