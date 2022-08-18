package mapping

import (
	"encoding/json"
	"reflect"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Handle(req string) (res view.MappingStruct, err error) {
	items := make([]view.MappingStructItem, 0)
	data := []byte(req)
	// Converted to json string structure type, the need to pay attention to is the json string type;
	var obj = map[string]interface{}{}
	err = json.Unmarshal(data, &obj)
	if err != nil {
		invoker.Logger.Error("Handle", elog.Any("req", req), elog.Any("err", err.Error()))
		return
	}
	for k, v := range obj {
		items = append(items, view.MappingStructItem{
			Key:   k,
			Value: fieldTypeJudgment(v),
		})
	}
	return view.MappingStruct{Data: items}, nil
}

// fieldTypeJudgment json -> clickhouse
func fieldTypeJudgment(req interface{}) string {
	var val string
	switch req.(type) {
	case string:
		val = "String"
	// case uint16:
	// 	val = "uint16"
	// case uint64:
	// 	val = "uint64"
	// case int32:
	// 	val = "int32"
	// case int64:
	// 	val = "int64"
	// case []interface{}:
	// 	val = "Array(T)"
	// case map[string]interface{}:
	// 	val = "JSON"
	case float64:
		val = "Float64"
	case bool:
		val = "Bool"
	default:
		if reflect.TypeOf(req) == nil {
			invoker.Logger.Warn("fieldTypeJudgment", elog.Any("type", reflect.TypeOf(req)))
			return "unknown"
		}
		invoker.Logger.Info("fieldTypeJudgment", elog.Any("type", reflect.TypeOf(req)))
		return "unknown"
	}
	return val
}
