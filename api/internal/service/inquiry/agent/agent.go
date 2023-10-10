package agent

import (
	"context"
	"database/sql"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory"
)

var _ factory.Operator = (*Agent)(nil)

type Agent struct {
}

func (a Agent) Conn() *sql.DB {
	// TODO implement me
	panic("implement me")
}

func (a Agent) GetLogs(query view.ReqQuery, i int) (resp view.RespQuery, err error) {
	req := search.Request{
		StartTime: query.ST,
		EndTime:   query.ET,
		Date:      query.Date,
		Path:      query.Path,
		Dir:       query.Dir,
		KeyWord:   query.Query,
		Limit:     int64(query.PageSize),
	}
	resp.Logs, err = search.Run(req)
	if err != nil {
		panic(err)
	}
	resp.Limited = query.PageSize
	resp.Count = uint64(len(resp.Logs))
	return resp, nil
}

func (a Agent) Chart(query view.ReqQuery) ([]*view.HighChart, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) Count(query view.ReqQuery) (uint64, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) GroupBy(query view.ReqQuery) map[string]uint64 {
	// TODO implement me
	panic("implement me")
}

func (a Agent) DoSQL(s string) (view.RespComplete, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) Prepare(query view.ReqQuery, b bool) (view.ReqQuery, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) SyncView(table db2.BaseTable, view *db2.BaseView, views []*db2.BaseView, b bool) (string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateDatabase(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateAlertView(s string, s2 string, s3 string) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateKafkaTable(table *db2.BaseTable, update view.ReqStorageUpdate) (string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateTable(i int, database db2.BaseDatabase, create view.ReqTableCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateStorageJSONAsString(database db2.BaseDatabase, create view.ReqStorageCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateStorage(i int, database db2.BaseDatabase, create view.ReqStorageCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateMetricsSamples(s string) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CreateBufferNullDataPipe(req db2.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) UpdateLogAnalysisFields(database db2.BaseDatabase, table db2.BaseTable, m map[string]*db2.BaseIndex, m2 map[string]*db2.BaseIndex, m3 map[string]*db2.BaseIndex) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) UpdateMergeTreeTable(table *db2.BaseTable, update view.ReqStorageUpdate) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) GetCreateSQL(database, table string) (string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) GetAlertViewSQL(alarm *db2.Alarm, table db2.BaseTable, i int, item *view.AlarmFilterItem) (string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) GetTraceGraph(ctx context.Context) ([]view.RespJaegerDependencyDataModel, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) GetMetricsSamples() error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) ClusterInfo() (clusters map[string]dto.ClusterInfo, err error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) ListSystemTable() []*view.SystemTables {
	// TODO implement me
	panic("implement me")
}

func (a Agent) ListSystemCluster() ([]*view.SystemClusters, map[string]*view.SystemClusters, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) ListDatabase() ([]*view.RespDatabaseSelfBuilt, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) ListColumn(s string, s2 string, b bool) ([]*view.RespColumn, error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) DeleteDatabase(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) DeleteAlertView(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) DeleteTable(s string, s2 string, s3 string, i int) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) DeleteTableListByNames(strings []string, s string) error {
	// TODO implement me
	panic("implement me")
}

func (a Agent) DeleteTraceJaegerDependencies(database, cluster, table string) (err error) {
	// TODO implement me
	panic("implement me")
}

func (a Agent) CalculateInterval(interval int64, timeField string) (string, int64) {
	// TODO implement me
	panic("implement me")
}

func NewFactoryAgent(db *sql.DB, ins *db2.BaseInstance) (*Agent, error) {
	return &Agent{}, nil
}
