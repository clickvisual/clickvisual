package inquiry

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func (c *ClickHouse) storageViewOperatorV3(param view.OperatorViewParams) (res string, err error) {
	databaseInfo, err := db.DatabaseInfo(invoker.Db, param.Did)
	if err != nil {
		return
	}
	if c.mode == ModeCluster {
		param.Table += "_local"
	}
	viewName := genViewName(databaseInfo.Name, param.Table, param.CustomTimeField)
	defer func() {
		if err != nil {
			c.viewRollback(param.Tid, param.CustomTimeField)
		}
	}()
	var (
		viewSQL string
	)
	jsonExtractSQL := ""
	if param.Tid != 0 {
		jsonExtractSQL = c.genJsonExtractSQLV3(param.Indexes)
	}
	dName := genName(databaseInfo.Name, param.Table)
	streamName := genStreamName(databaseInfo.Name, param.Table)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	if c.mode == ModeCluster {
		if databaseInfo.Cluster == "" {
			err = constx.ErrClusterNameEmpty
			return
		}
		viewDropSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER `%s` ;", viewName, databaseInfo.Cluster)
	}
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
		elog.Error("viewOperator", elog.String("viewDropSQL", viewDropSQL), elog.String("jsonExtractSQL", jsonExtractSQL), elog.String("viewName", viewName), elog.String("cluster", databaseInfo.Cluster))
		return "", err
	}
	// create
	var timeConv string
	var whereCond string
	if param.CustomTimeField == "" {
		timeConv = c.timeParseSQLV3(param.Typ, nil, param.TimeField)
		whereCond = c.whereConditionSQLDefaultV3(param.List)
	} else {
		if param.Current == nil {
			return "", errors.New("the process processes abnormal data errors, current view cannot be nil")
		}
		timeConv = c.timeParseSQLV3(param.Typ, param.Current, param.TimeField)
		whereCond = c.whereConditionSQLCurrentV3(param.Current)
	}
	viewSQL = c.ViewDo(bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       param.TimeField,
		Cluster:         databaseInfo.Cluster,
		ReplicaStatus:   c.rs,
		View: bumo.ParamsView{
			ViewTable:        viewName,
			TargetTable:      dName,
			TimeConvert:      timeConv,
			CommonFields:     jsonExtractSQL,
			SourceTable:      streamName,
			Where:            whereCond,
			IsKafkaTimestamp: param.IsKafkaTimestamp,
		},
	})
	if param.IsCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouse) genJsonExtractSQLV3(indexes map[string]*db.BaseIndex) string {
	rawLogField := constx.UBWKafkaStreamField
	jsonExtractSQL := ",\n"
	for _, obj := range indexes {
		if obj.RootName == "" {
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(%s, '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.Field, obj.GetFieldName())
		} else {
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(JSONExtractString(%s, '%s'), '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",\n")
	return jsonExtractSQL
}

func (c *ClickHouse) whereConditionSQLCurrentV3(current *db.BaseView) string {
	rawLogField := constx.UBWKafkaStreamField
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(%s, '%s') = 1", rawLogField, current.Key)
}

func (c *ClickHouse) whereConditionSQLDefaultV3(list []*db.BaseView) string {
	rawLogField := constx.UBWKafkaStreamField
	if list == nil {
		return "1=1"
	}
	var defaultSQL string
	// It is required to obtain all the view parameters under the current table and construct the default and current view query conditions
	for k, viewRow := range list {
		if k == 0 {
			defaultSQL = fmt.Sprintf("JSONHas(%s, '%s') = 0", rawLogField, viewRow.Key)
		} else {
			defaultSQL = fmt.Sprintf("%s AND JSONHas(%s, '%s') = 0", defaultSQL, rawLogField, viewRow.Key)
		}
	}
	if defaultSQL == "" {
		return "1=1"
	}
	return defaultSQL
}

func (c *ClickHouse) timeParseSQLV3(typ int, v *db.BaseView, timeField string) string {
	rawLogField := constx.UBWKafkaStreamField
	if timeField == "" {
		timeField = "_time_"
	}
	if v != nil && v.Format == "fromUnixTimestamp64Micro" && v.IsUseDefaultTime == 0 {
		return fmt.Sprintf(nanosecondTimeParse, rawLogField, v.Key, rawLogField, v.Key)
	}
	if typ == TableTypeString {
		return fmt.Sprintf(defaultStringTimeParseV3, rawLogField, timeField, rawLogField, timeField)
	}
	return fmt.Sprintf(defaultFloatTimeParseV3, rawLogField, timeField, rawLogField, timeField)
}

// Deprecated: isTrace  yes 1 no 0
func isTrace(res map[string]interface{}) int {
	if key, keyOk := res["_key"]; !keyOk || key == "" {
		return 0
	}
	rawLog, rawLogOk := res["_raw_log_"]
	if !rawLogOk {
		return 0
	}
	jj := JaegerJson{}
	_ = json.Unmarshal([]byte(strings.ReplaceAll(rawLog.(string), "\\\"", "\"")), &jj)
	if jj.TraceId != "" &&
		jj.SpanId != "" &&
		jj.Duration != "" {
		return 1
	}
	jjo := JaegerJsonOriginal{}
	_ = json.Unmarshal([]byte(strings.ReplaceAll(rawLog.(string), "\\\"", "\"")), &jjo)
	if jj.TraceId != "" &&
		jj.SpanId != "" &&
		jj.Duration != "" {
		return 1
	}
	return 0
}

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
