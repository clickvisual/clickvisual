package agent

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory"
)

var _ factory.Operator = (*Agent)(nil)

type Agent struct {
	agents     []string
	httpClient *resty.Client
}

func (a *Agent) Conn() *sql.DB {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) parseHitLog(k8sClientType string, item view.RespAgentSearchItem) (log map[string]interface{}, err error) {
	elog.Info("parseHitLog", l.S("k8sClientType", k8sClientType))
	line := item.Line
	if line == "" {
		return nil, errors.New("line is empty")
	}
	log = make(map[string]interface{})
	curTime, indexValue := utils.IndexParseTime(line)
	if indexValue != -1 {
		curTimeParser := utils.TimeParse(curTime)
		if curTimeParser != nil {
			ts := curTimeParser.Unix()
			if k8sClientType == cvdocker.ClientTypeContainerd {
				line = utils.GetFilterK8SContainerdWrapLog(line)
			}
			log[db.TimeFieldSecond] = ts
			log["_raw_log_"] = line
			for k, v := range item.Ext {
				log[k] = v
			}
		}
	} else {
		log = nil
	}
	return log, nil
}

func (a *Agent) GetLogs(query view.ReqQuery, i int) (resp view.RespQuery, err error) {
	tmpLogs := make([]map[string]interface{}, 0)
	for _, agent := range a.agents {
		if !strings.HasPrefix(agent, "http://") {
			agent = "http://" + agent
		}
		data := map[string]string{
			"startTime": fmt.Sprintf("%d", query.ST),
			"endTime":   fmt.Sprintf("%d", query.ET),
		}
		if len(query.K8SContainer) != 0 {
			data["container"] = fmt.Sprintf(strings.Join(query.K8SContainer, ","))
			data["isK8s"] = "1"
		}
		if query.Query != "" && query.Query != "*" {
			data["keyWord"] = query.Query
		}
		if query.Dir != "" {
			data["dir"] = query.Dir
		} else {
			data["isK8s"] = "1"
		}
		data["limit"] = fmt.Sprintf("%d", query.PageSize)
		elog.Info("get agent logs request", l.S("agent", agent), l.A("request", data))
		searchResp, err := a.httpClient.R().EnableTrace().SetQueryParams(data).Get(agent + "/api/v1/search")
		if err != nil {
			elog.Error("get agent logs error", l.E(err), l.S("agent", agent))
			return view.RespQuery{}, errors.Wrapf(err, "request agent %s error", agent)
		}
		var res struct {
			Code int                  `json:"code"`
			Msg  string               `json:"msg"`
			Data view.RespAgentSearch `json:"data"`
		}
		err = json.Unmarshal(searchResp.Body(), &res)
		if err != nil {
			elog.Error("Unmarshal agent logs resp body error", l.E(err), l.S("agent", agent))
			return view.RespQuery{}, errors.Wrapf(err, "unmarshal agent %s response error, body is %s", agent, string(searchResp.Body()))
		}
		// 返回数据处理
		for _, d := range res.Data.Data {
			logs, err := a.parseHitLog(res.Data.K8sClientType, d)
			if err != nil {
				elog.Error("parse agent log error", l.E(err))
				continue
			}
			if logs != nil {
				tmpLogs = append(tmpLogs, logs)
			}
		}
	}
	if len(tmpLogs) > 100 {
		resp.Logs = tmpLogs[:100]
	} else {
		resp.Logs = tmpLogs
	}
	sort.Slice(resp.Logs, func(i, j int) bool {
		return resp.Logs[i][db.TimeFieldSecond].(int64) > resp.Logs[j][db.TimeFieldSecond].(int64)
	})
	resp.Count = uint64(len(resp.Logs))
	resp.Keys = make([]*db2.BaseIndex, 0)
	resp.ShowKeys = make([]string, 0)
	resp.HiddenFields = make([]string, 0)
	resp.DefaultFields = make([]string, 0)
	resp.Terms = make([][]string, 0)
	return resp, nil
}

func (a *Agent) Chart(query view.ReqQuery) ([]*view.HighChart, string, error) {
	resp := make([]*view.HighChart, 0)
	chartsOffsetMap := make(map[int64]int64)
	minOffset, maxOffset := int64(-1), int64(-1)
	interval := int64(0)
	for _, agent := range a.agents {
		if !strings.HasPrefix(agent, "http://") {
			agent = "http://" + agent
		}
		data := map[string]string{
			"startTime": fmt.Sprintf("%d", query.ST),
			"endTime":   fmt.Sprintf("%d", query.ET),
		}
		if len(query.K8SContainer) != 0 {
			data["container"] = fmt.Sprintf(strings.Join(query.K8SContainer, ","))
			data["isK8s"] = "1"
		}
		if query.Query != "" && query.Query != "*" {
			data["keyWord"] = query.Query
		}
		if query.Dir != "" {
			data["dir"] = query.Dir
		} else {
			data["isK8s"] = "1"
		}

		_, interval = a.CalculateInterval(query.ET-query.ST, "")
		data["interval"] = strconv.FormatInt(interval, 10)
		data["isChartRequest"] = "1"

		elog.Info("get agent charts request", l.S("agent", agent), l.A("request", data))
		searchResp, err := a.httpClient.R().EnableTrace().SetQueryParams(data).Get(agent + "/api/v1/charts")
		if err != nil {
			elog.Error("get agent charts error", l.E(err), l.S("agent", agent))
			return nil, "", errors.Wrapf(err, "get agent %s charts error", agent)
		}
		var res struct {
			Code int                        `json:"code"`
			Msg  string                     `json:"msg"`
			Data view.RespAgentChartsSearch `json:"data"`
		}
		err = json.Unmarshal(searchResp.Body(), &res)
		if err != nil {
			elog.Error("Unmarshal agent charts resp body error", l.E(err), l.S("agent", agent), l.S("body", string(searchResp.Body())))
			return nil, "", errors.Wrapf(err, "unmarshal agent %s response error, body is %s", agent, string(searchResp.Body()))
		}
		if minOffset == -1 || res.Data.MinOffset < minOffset {
			minOffset = res.Data.MinOffset
		}

		if maxOffset == -1 || res.Data.MaxOffset > maxOffset {
			maxOffset = res.Data.MaxOffset
		}

		// 返回数据处理
		for k, v := range res.Data.Data {
			chartsOffsetMap[k] += v
		}

	}

	for i := minOffset; i <= maxOffset; i++ {
		start := query.ST + i*interval
		end := query.ST + (i+1)*interval
		count := int64(0)
		if cnt, ok := chartsOffsetMap[i]; ok {
			count = cnt
		}
		resp = append(resp, &view.HighChart{
			From:  start,
			To:    end,
			Count: uint64(count),
		})
	}
	return resp, "", nil
}

func (a *Agent) Count(query view.ReqQuery) (uint64, error) {
	// TODO implement me
	return 0, nil
}

func (a *Agent) GroupBy(query view.ReqQuery) map[string]uint64 {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) DoSQL(s string) (view.RespComplete, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) Prepare(query view.ReqQuery, table *db2.BaseTable, b bool) (view.ReqQuery, error) {
	if query.Query == "" {
		query.Query = "*"
	}
	if table.Database.Desc != "" {
		var tmp = make([]string, 0)
		err := json.Unmarshal([]byte(table.Database.Desc), &tmp)
		if err != nil {
			query.Dir = table.Database.Desc
		} else {
			query.K8SContainer = tmp
		}
	}
	if table.Name != "*" {
		query.K8SContainer = []string{table.Name}
	}
	return query, nil
}

func (a *Agent) SyncView(table db2.BaseTable, view *db2.BaseView, views []*db2.BaseView, b bool) (string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateDatabase(s string, s2 string) error {
	return nil
}

func (a *Agent) CreateAlertView(s string, s2 string, s3 string) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateKafkaTable(table *db2.BaseTable, update view.ReqStorageUpdate) (string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateTable(i int, database db2.BaseDatabase, create view.ReqTableCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateStorageJSONAsString(database db2.BaseDatabase, create view.ReqStorageCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateStorage(i int, database db2.BaseDatabase, create view.ReqStorageCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateMetricsSamples(s string) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CreateBufferNullDataPipe(req db2.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) UpdateLogAnalysisFields(database db2.BaseDatabase, table db2.BaseTable, m map[string]*db2.BaseIndex, m2 map[string]*db2.BaseIndex, m3 map[string]*db2.BaseIndex) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) UpdateMergeTreeTable(table *db2.BaseTable, update view.ReqStorageUpdate) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) GetCreateSQL(database, table string) (string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) GetAlertViewSQL(alarm *db2.Alarm, table db2.BaseTable, i int, item *view.AlarmFilterItem) (string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) GetTraceGraph(ctx context.Context) ([]view.RespJaegerDependencyDataModel, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) GetMetricsSamples() error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) ClusterInfo() (clusters map[string]dto.ClusterInfo, err error) {
	// TODO implement me
	return map[string]dto.ClusterInfo{}, nil
}

func (a *Agent) ListSystemTable() []*view.SystemTables {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) ListSystemCluster() ([]*view.SystemClusters, map[string]*view.SystemClusters, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) ListDatabase() ([]*view.RespDatabaseSelfBuilt, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) ListColumn(s string, s2 string, b bool) ([]*view.RespColumn, error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) DeleteDatabase(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) DeleteAlertView(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) DeleteTable(s string, s2 string, s3 string, i int) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) DeleteTableListByNames(strings []string, s string) error {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) DeleteTraceJaegerDependencies(database, cluster, table string) (err error) {
	// TODO implement me
	panic("implement me")
}

func (a *Agent) CalculateInterval(interval int64, timeField string) (sql string, standard int64) {
	standard = search.ChartsIntervalConvert(interval)
	return
}

func NewFactoryAgent(dsn string) (*Agent, error) {
	agents := make([]string, 0)
	_ = json.Unmarshal([]byte(dsn), &agents)
	return &Agent{
		agents:     agents,
		httpClient: resty.New().SetTimeout(time.Second * 10),
	}, nil
}
