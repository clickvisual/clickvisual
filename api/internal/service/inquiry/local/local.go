package local

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory"
)

var _ factory.Operator = (*Local)(nil)

type Local struct {
	regLike *regexp.Regexp
}

func NewFactoryLocal(dsn string) (*Local, error) {
	return &Local{
		regLike: regexp.MustCompile(`'%([^%]+)%'`),
	}, nil
}

func (l Local) Conn() *sql.DB {
	// TODO implement me
	panic("implement me")
}

func (l Local) Chart(query view.ReqQuery) ([]*view.HighChart, string, error) {
	// TODO implement me
	return []*view.HighChart{}, "", nil
}

func (l Local) Count(query view.ReqQuery) (uint64, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) GroupBy(query view.ReqQuery) map[string]uint64 {
	// TODO implement me
	panic("implement me")
}

func (l Local) DoSQL(s string) (view.RespComplete, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) Prepare(query view.ReqQuery, table *db.BaseTable, b bool) (view.ReqQuery, error) {
	query.Query = l.agentQueryAdapted(query.Query)
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

func (l Local) agentQueryAdapted(query string) (res string) {
	if query == "" {
		return "*"
	}
	// 按照 and 拆分
	query = l.queryTransformLike(query)
	return query
}

func (l Local) queryTransformLike(query string) (res string) {
	andArr := transformAndArr(query)
	if len(andArr) > 0 {
		for k, item := range andArr {
			item = strings.TrimSpace(item)
			if k == 0 {
				res = l.findBetweenPercentSigns(item)
				continue
			}
			res = fmt.Sprintf("%s and %s", res, l.findBetweenPercentSigns(item))
		}
		return res
	}
	return l.findBetweenPercentSigns(query)
}

func transformAndArr(query string) []string {
	var res = make([]string, 0)
	if strings.Contains(query, " AND ") {
		res = strings.Split(query, " AND ")
	}
	if strings.Contains(query, " and ") {
		res = strings.Split(query, " and ")
	}
	return res
}

func (l Local) findBetweenPercentSigns(input string) string {
	// 在输入字符串中查找所有匹配的子串
	matches := l.regLike.FindAllStringSubmatch(input, -1)
	// 提取匹配的内容
	for _, match := range matches {
		if len(match) > 1 {
			return match[1]
		}
	}
	return input
}

func (l Local) SyncView(table db.BaseTable, view *db.BaseView, views []*db.BaseView, b bool) (string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateDatabase(s string, s2 string) error {
	return nil
}

func (l Local) CreateAlertView(s string, s2 string, s3 string) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateKafkaTable(table *db.BaseTable, update view.ReqStorageUpdate) (string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateTable(i int, database db.BaseDatabase, create view.ReqTableCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateStorageJSONAsString(database db.BaseDatabase, create view.ReqStorageCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateStorage(i int, database db.BaseDatabase, create view.ReqStorageCreate) (string, string, string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateMetricsSamples(s string) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) CreateBufferNullDataPipe(req db.ReqCreateBufferNullDataPipe) (names []string, sqls []string, err error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) UpdateLogAnalysisFields(database db.BaseDatabase, table db.BaseTable, m map[string]*db.BaseIndex, m2 map[string]*db.BaseIndex, m3 map[string]*db.BaseIndex) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) UpdateMergeTreeTable(table *db.BaseTable, update view.ReqStorageUpdate) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) GetLogs(query view.ReqQuery, i int) (resp view.RespQuery, err error) {
	data := search.Request{
		StartTime: query.ST,
		EndTime:   query.ET,
		Dir:       query.Dir,
		Limit:     int64(query.PageSize),
	}
	if query.Query != "" && query.Query != "*" {
		data.KeyWord = query.Query
	}
	// ClickVisual设计的标准语法是 `lv`='error'
	// 如果在日志中搜索实际是 "lv":"error"
	// 并且要能够将系统的 `_file_`='/xxx/xxx/ego.sys' 排除

	respSearch, err := search.Run(data)
	if err != nil {
		return view.RespQuery{}, fmt.Errorf("search run fail, err: %w", err)
	}

	if len(respSearch.Data) > 50 {
		respSearch.Data = respSearch.Data[:50]
	}
	tmpLogs := make([]map[string]any, 0)

	// 返回数据处理
	for _, d := range respSearch.Data {
		logs, err := l.parseHitLog(d)
		if err != nil {
			elog.Error("parse agent log error", elog.FieldErr(err))
			continue
		}
		if logs != nil {
			tmpLogs = append(tmpLogs, logs)
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
	resp.Keys = make([]*db.BaseIndex, 0)
	resp.ShowKeys = make([]string, 0)
	resp.HiddenFields = make([]string, 0)
	resp.DefaultFields = make([]string, 0)
	resp.Terms = make([][]string, 0)
	return resp, nil
}

func (a *Local) parseHitLog(item view.RespAgentSearchItem) (log map[string]interface{}, err error) {
	line := item.Line
	if line == "" {
		return nil, fmt.Errorf("line is empty")
	}
	log = make(map[string]interface{})
	curTime, indexValue := utils.IndexParseTime(line)
	if indexValue != -1 {

		//curTimeParser := utils.TimeParse(curTime)
		//if curTimeParser != nil {
		//ts := curTimeParser.Unix()
		log[db.TimeFieldSecond] = curTime
		log["_raw_log_"] = line
		for k, v := range item.Ext {
			log[k] = v
		}
		//}

	} else {
		log = nil
	}
	return log, nil
}

func (l Local) GetCreateSQL(database, table string) (string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) GetAlertViewSQL(alarm *db.Alarm, table db.BaseTable, i int, item *view.AlarmFilterItem) (string, string, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) GetTraceGraph(ctx context.Context) ([]view.RespJaegerDependencyDataModel, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) GetMetricsSamples() error {
	// TODO implement me
	panic("implement me")
}

func (l Local) ClusterInfo() (clusters map[string]dto.ClusterInfo, err error) {
	return make(map[string]dto.ClusterInfo, 0), nil
}

func (l Local) ListSystemTable() []*view.SystemTables {
	// TODO implement me
	panic("implement me")
}

func (l Local) ListSystemCluster() ([]*view.SystemClusters, map[string]*view.SystemClusters, error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) ListDatabase() ([]*view.RespDatabaseSelfBuilt, error) {
	return make([]*view.RespDatabaseSelfBuilt, 0), nil
}

func (l Local) ListColumn(s string, s2 string, b bool) ([]*view.RespColumn, error) {
	// TODO implement me
	res := make([]*view.RespColumn, 0)
	return res, nil
}

func (l Local) DeleteDatabase(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) DeleteAlertView(s string, s2 string) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) DeleteTable(s string, s2 string, s3 string, i int) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) DeleteTableListByNames(strings []string, s string) error {
	// TODO implement me
	panic("implement me")
}

func (l Local) DeleteTraceJaegerDependencies(database, cluster, table string) (err error) {
	// TODO implement me
	panic("implement me")
}

func (l Local) CalculateInterval(interval int64, timeField string) (sql string, standard int64) {
	standard = search.ChartsIntervalConvert(interval)
	return
}
