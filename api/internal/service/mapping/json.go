package mapping

import (
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Handle(req string) (res view.MappingStruct, err error) {
	items := make([]view.MappingStructItem, 0)
	data := []byte(req)
	var obj = map[string]interface{}{}
	err = json.Unmarshal(data, &obj) // 将json字符串转化成结构体类型，此处需要注意json是字符串类型。
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

	fmt.Println("req.(type)", reflect.TypeOf(req))

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
	case float64:
		val = "Float64"
	case bool:
		val = "Bool"
	default:
		if reflect.TypeOf(req) == nil {
			return "unknown"
		}
		return "unknown"
	}
	return val
}
