package inquiry

import (
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

var regSingleWord = regexp.MustCompile(`([a-z]|[A-Z]|[0-9]|_|-|')+`)
var regDistributedSubTable = regexp.MustCompile(`ENGINE = Distributed\([^,]+,[^,]+,([\S\s]+),`)

type JaegerJsonOriginal struct {
	TraceId  string `json:"trace_id"`
	SpanId   string `json:"span_id"`
	Duration string `json:"duration"`
}

type JaegerJson struct {
	TraceId       string    `json:"traceId"`
	SpanId        string    `json:"spanId"`
	OperationName string    `json:"operationName"`
	StartTime     time.Time `json:"startTime"`
	Duration      string    `json:"duration"`
	Tags          []struct {
		Key    string `json:"key"`
		VStr   string `json:"vStr,omitempty"`
		VType  string `json:"vType,omitempty"`
		VInt64 string `json:"vInt64,omitempty"`
	} `json:"tags"`
	Process struct {
		ServiceName string `json:"serviceName"`
		Tags        []struct {
			Key  string `json:"key"`
			VStr string `json:"vStr"`
		} `json:"tags"`
	} `json:"process"`
}

type queryItem struct {
	Key      string
	Operator string
	Value    string
}

func transformJaegerDependencies(req []view.JaegerDependencyDataModel) (resp []view.RespJaegerDependencyDataModel) {
	data := make(map[string][]view.JaegerDependencyDataModel, 0)
	for _, row := range req {
		key := row.Parent + "-" + row.Child
		data[key] = append(data[key], row)
	}
	for _, row := range data {
		respRow := view.RespJaegerDependencyDataModel{}
		for _, j := range row {
			respRow.Child = j.Child
			respRow.Parent = j.Parent
			respRow.CallCount += j.CallCount
			respRow.ServerDurationP50 += j.ServerDurationP50
			respRow.ServerDurationP90 += j.ServerDurationP90
			respRow.ServerDurationP99 += j.ServerDurationP99
			respRow.ClientDurationP50 += j.ClientDurationP50
			respRow.ClientDurationP90 += j.ClientDurationP90
			respRow.ClientDurationP99 += j.ClientDurationP99
			respRow.ServerSuccessRate += j.ServerSuccessRate
			respRow.ClientSuccessRate += j.ClientSuccessRate
		}
		l := float64(len(row))
		respRow.ServerDurationP50 = respRow.ServerDurationP50 / l
		respRow.ServerDurationP90 = respRow.ServerDurationP90 / l
		respRow.ServerDurationP99 = respRow.ServerDurationP99 / l
		respRow.ClientDurationP50 = respRow.ClientDurationP50 / l
		respRow.ClientDurationP90 = respRow.ClientDurationP90 / l
		respRow.ClientDurationP99 = respRow.ClientDurationP99 / l
		respRow.ServerSuccessRate = respRow.ServerSuccessRate / l
		respRow.ClientSuccessRate = respRow.ClientSuccessRate / l
		resp = append(resp, respRow)
	}
	return
}

func genTimeCondition(param view.ReqQuery) string {
	switch param.TimeFieldType {
	case db.TimeFieldTypeDT:
		return fmt.Sprintf("%s >= toDateTime(%s) AND %s < toDateTime(%s)", param.TimeField, "%d", param.TimeField, "%d")
	case db.TimeFieldTypeDT3:
		return fmt.Sprintf("%s >= toDateTime64(%s, 3) AND %s < toDateTime64(%s, 3)", param.TimeField, "%d", param.TimeField, "%d")
	case db.TimeFieldTypeTsMs:
		return fmt.Sprintf("intDiv(%s,1000) >= %s AND intDiv(%s,1000) < %s", param.TimeField, "%d", param.TimeField, "%d")
	}
	return param.TimeField + " >= %d AND " + param.TimeField + " < %d"
}

func TransferGroupTimeField(timeField string, timeFieldTyp int) string {
	switch timeFieldTyp {
	case db.TimeFieldTypeDT:
		return timeField
	case db.TimeFieldTypeDT3:
		return timeField
	case db.TimeFieldTypeTsMs:
		return fmt.Sprintf("toDateTime(intDiv(%s,1000))", timeField)
	case db.TimeFieldTypeSecond:
		return fmt.Sprintf("toDateTime(%s)", timeField)
	}
	return timeField
}

func genTimeConditionEqual(param view.ReqQuery, t time.Time) string {
	switch param.TimeFieldType {
	case db.TimeFieldTypeDT:
		return fmt.Sprintf("toUnixTimestamp(%s) = %d", param.TimeField, t.Unix())
	case db.TimeFieldTypeDT3:
		return fmt.Sprintf("%s = toDateTime64(%f, 3)", param.TimeField, float64(t.UnixMilli())/1000.0)
	case db.TimeFieldTypeTsMs:
		return fmt.Sprintf("%s = %d", param.TimeField, t.UnixMilli())
	}
	return fmt.Sprintf("%s = %d", param.TimeField, t.Unix())
}

func resultAppend(input []string, k, v string, withQuote bool) []string {
	if withQuote {
		input = append(input, fmt.Sprintf("'%s=%s'", k, v))
	} else {
		input = append(input, fmt.Sprintf(`%s="%s"`, k, v))
	}
	return input
}

func fieldTypeJudgment(typ string) int {
	for _, val := range typArr {
		if strings.Contains(typ, val) {
			return typKey[val]
		}
	}
	return -1
}

func alarmAggregationSQLWith(param view.ReqQuery) (sql string) {
	out := fmt.Sprintf(`with(
select val from (%s) limit 1
) as limbo
SELECT
   limbo as "metrics",
   %s as timestamp
FROM  %s GROUP BY %s ORDER BY %s DESC LIMIT 10
`, adaSelectPart(param.Query), param.TimeField, param.DatabaseTable, param.TimeField, param.TimeField)
	return out
}

func adaSelectPart(in string) (out string) {
	arr := strings.Split(strings.Replace(in, "from", "FROM", 1), "FROM ")
	if len(arr) <= 1 {
		return in
	}
	if strings.Contains(arr[0], ",") {
		return in
	}
	trimSelect := strings.Replace(arr[0], "select", "", 1)
	trimSelect = strings.Replace(trimSelect, "SELECT", "", 1)
	trimSelect = strings.Replace(trimSelect, "\n", "", 1)
	onlySelect := strings.TrimSpace(trimSelect)
	return fmt.Sprintf("%s,%s FROM %s", arr[0], onlySelect, arr[1])
}

func genSelectFields(tid int) string {
	tableInfo, _ := db.TableInfo(invoker.Db, tid)
	if tableInfo.CreateType == constx.TableCreateTypeCV {
		if tableInfo.SelectFields != "" {
			return tableInfo.SelectFields
		}
		return "_source_,_cluster_,_log_agent_,_namespace_,_node_name_,_node_ip_,_container_name_,_pod_name_,_time_second_,_time_nanosecond_,_raw_log_"
	}
	return "*"
}

func queryTransformLike(createType int, rawLogField, query string) string {
	if query == "" {
		return query
	}
	var res string
	andArr := likeTransformAndArr(query)
	if len(andArr) > 0 {
		for k, item := range andArr {
			item = strings.TrimSpace(item)
			if k == 0 {
				res = likeTransform(createType, rawLogField, item)
				continue
			}
			res = fmt.Sprintf("%s AND %s", res, likeTransform(createType, rawLogField, item))
		}
		return res
	}
	return likeTransform(createType, rawLogField, query)
}

func likeTransformAndArr(query string) []string {
	var res = make([]string, 0)
	if strings.Contains(query, " AND ") {
		res = strings.Split(query, " AND ")
	}
	if strings.Contains(query, " and ") {
		res = strings.Split(query, " and ")
	}
	return res
}

func queryTransformHash(params view.ReqQuery) string {
	query := params.Query
	conds := egorm.Conds{}
	conds["tid"] = params.Tid
	conds["hash_typ"] = egorm.Cond{Op: "!=", Val: 0}
	indexes, _ := db.IndexList(conds)
	for _, index := range indexes {
		if index.HashTyp == 0 {
			continue
		}
		query = hashTransform(query, index)
	}
	elog.Debug("chartSQL", elog.Any("step", "queryTransform"), elog.Any("indexes", indexes), elog.Any("query", query))
	if query == defaultCondition {
		return ""
	}
	return query
}

func likeTransform(createType int, rawLogField, query string) string {
	// 判断是否可以进行转换
	matches := regSingleWord.FindAllString(strings.TrimSpace(query), -1)
	if len(matches) != 1 {
		return query
	}
	field := "_raw_log_"
	if createType == constx.TableCreateTypeExist && rawLogField != "" {
		field = rawLogField
	}
	return field + " LIKE '%" + query + "%'"
}

func hashTransform(query string, index *db.BaseIndex) string {
	var (
		key              = index.GetFieldName()
		hashTyp          = index.HashTyp
		hashFieldName, _ = index.GetHashFieldName()
	)
	if strings.Contains(query, key+"=") && (hashTyp == 1 || hashTyp == 2) {
		cache := query
		r, _ := regexp.Compile(key + "='(\\S*)'")
		val := r.FindString(query)
		val = strings.Replace(val, key+"=", "", 1)
		query = strings.Replace(query, key+"=", hashFieldName+"=", 1)
		if hashTyp == db.HashTypeSip {
			query = strings.Replace(query, val, fmt.Sprintf("sipHash64(%s)", val), 1)
		}
		if hashTyp == db.HashTypeURL {
			query = strings.Replace(query, val, fmt.Sprintf("URLHash(%s)", val), 1)
		}
		if !strings.HasPrefix(query, "_inner") && !strings.Contains(query, " _inner") {
			query = cache
		}
	}
	return query
}

// isEmpty filter empty index value
func isEmpty(input interface{}) bool {
	var val string
	switch input.(type) {
	case string:
		val = input.(string)
	case uint8:
		val = fmt.Sprintf("%d", input.(uint8))
	case uint16:
		val = fmt.Sprintf("%d", input.(uint16))
	case uint64:
		val = fmt.Sprintf("%d", input.(uint64))
	case int32:
		val = fmt.Sprintf("%d", input.(int32))
	case int64:
		val = fmt.Sprintf("%d", input.(int64))
	case *uint64:
		val = fmt.Sprintf("%d", input.(*uint64))
	case float64:
		val = fmt.Sprintf("%f", input.(float64))
	case []string:
		return false
	case time.Time:
		return false
	default:
		if reflect.TypeOf(input) == nil {
			return true
		}
		elog.Warn("isEmpty", elog.String("val", val), elog.Any("type", reflect.TypeOf(input)))
		return false
	}
	if val == "" || val == "NaN" {
		return true
	}
	return false
}

func tableTypStr(typ int) string {
	if typ == TableTypeString {
		return "String"
	} else if typ == TableTypeFloat {
		return "Float64"
	}
	return ""
}

func genName(database, tableName string) string {
	return fmt.Sprintf("`%s`.`%s`", database, tableName)
}

func genNameWithMode(clusterMode int, database, tableName string) string {
	if clusterMode == ModeCluster {
		return fmt.Sprintf("`%s`.`%s_local`", database, tableName)
	}
	return fmt.Sprintf("`%s`.`%s`", database, tableName)
}

func genSQLClusterInfo(clusterMode int, clusterName string) string {
	if clusterMode == ModeCluster {
		return fmt.Sprintf(" ON CLUSTER `%s`", clusterName)
	}
	return ""
}

func genStreamName(database, tableName string) string {
	return fmt.Sprintf("`%s`.`%s_stream`", database, tableName)
}

func genStreamNameWithMode(clusterMode int, database, tableName string) string {
	if clusterMode == ModeCluster {
		return fmt.Sprintf("`%s`.`%s_local_stream`", database, tableName)
	}
	return fmt.Sprintf("`%s`.`%s_stream`", database, tableName)
}

func genViewName(database, tableName string, timeKey string) string {
	if timeKey == "" {
		return fmt.Sprintf("`%s`.`%s_view`", database, tableName)
	}
	return fmt.Sprintf("`%s`.`%s_%s_view`", database, tableName, timeKey)
}

func queryTransformer(in string) (out string, err error) {
	items := make([]queryItem, 0)
	items, err = queryEncode(in)
	if err != nil {
		return
	}
	out = queryDecode(items)
	return
}

func queryEncode(in string) ([]queryItem, error) {
	res := make([]queryItem, 0)
	for _, a := range strings.Split(in, "' and ") {
		for _, op := range queryOperatorArr {
			if err := queryEncodeOperation(a, op, &res); err != nil {
				return nil, err
			}
		}
	}
	return res, nil
}

func queryDecode(in []queryItem) (out string) {
	for index, item := range in {
		if item.Key == db.TimeFieldSecond {
			item.Value = fmt.Sprintf("'%d'", dayTime2Timestamp(item.Value, "'2006-01-02T15:04:05+08:00'"))
		}
		if index == 0 {
			out = fmt.Sprintf("%s%s%s", item.Key, item.Operator, item.Value)
		} else {
			out = fmt.Sprintf("%s and %s%s%s", out, item.Key, item.Operator, item.Value)
		}
	}
	return
}

func dayTime2Timestamp(in string, layout string) int64 {
	if layout == "" {
		layout = "2006-01-02 15:04:05"
	}
	loc, _ := time.LoadLocation("Local")
	theTime, _ := time.ParseInLocation(layout, in, loc)
	return theTime.Unix()
}

func queryEncodeOperation(a string, op string, res *[]queryItem) error {
	if !strings.Contains(a, op) {
		return nil
	}
	opArr := strings.SplitN(strings.TrimSpace(a), op, 2)
	if len(opArr) != 2 {
		return constx.ErrQueryFormatIllegal
	}
	val := opArr[1]
	if strings.Contains(val, "'") {
		val = strings.TrimSuffix(val, "'") + "'"
	}
	*res = append(*res, queryItem{
		Key:      opArr[0],
		Operator: op,
		Value:    val,
	})
	return nil
}

func getDistributedSubTableName(sql string) (string, error) {
	matches := regDistributedSubTable.FindStringSubmatch(strings.TrimSpace(sql))
	if len(matches) == 2 {
		res := strings.TrimSpace(matches[1])
		res = strings.ReplaceAll(res, "'", "")
		return res, nil
	}
	return "", errors.New("cannot find mergeTree table")
}
