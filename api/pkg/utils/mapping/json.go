package mapping

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"

	"github.com/gotomicro/ego/core/elog"
)

type List struct {
	Data []Item `json:"data"`
}

type Item struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (m *Item) Assemble(withType bool) string {
	if withType {
		return fmt.Sprintf("`%s` %s,", m.Key, fieldReplace(m.Value))
	}
	return fmt.Sprintf("`%s`,", m.Key)
}

func (m *Item) AssembleJSONAsString() (res string) {
	if strings.Contains(m.Value, "JSON") {
		// 需要将包含 JSON 类型的数据转换为 string
		return fmt.Sprintf("toString(JSONExtractRaw(_log, '%s')) AS `%s`,", m.Key, m.Key)
	}
	if m.Value == "String" {
		return fmt.Sprintf("JSONExtractString(_log, '%s') AS `%s`,", m.Key, m.Key)
	}
	if m.Value == "Float64" {
		return fmt.Sprintf("JSONExtractFloat(_log, '%s') AS `%s`,", m.Key, m.Key)
	}
	if m.Value == "Bool" {
		return fmt.Sprintf("JSONExtractBool(_log, '%s') AS `%s`,", m.Key, m.Key)
	}
	return fmt.Sprintf("JSONExtractRaw(_log, '%s') AS `%s`,", m.Key, m.Key)
}

func Handle(req string) (res List, err error) {
	items := make([]Item, 0)
	data := []byte(req)
	// Converted to json string structure type, the need to pay attention to is the json string type;
	var obj = map[string]interface{}{}
	err = json.Unmarshal(data, &obj)
	if err != nil {
		elog.Error("Handle", elog.Any("req", req), elog.Any("err", err.Error()))
		return
	}
	for k, v := range obj {
		items = append(items, Item{
			Key:   k,
			Value: fieldTypeJudgment(v),
		})
	}
	return List{Data: items}, nil
}

func fieldReplace(current string) (after string) {
	if strings.Contains(current, "JSON") {
		return "String"
	}
	return current
}

// fieldTypeJudgment json -> clickhouse
func fieldTypeJudgment(req interface{}) string {
	var val string
	switch req.(type) {
	case string:
		val = "String"
	case []interface{}:
		innerTyp := fieldTypeJudgment(req.([]interface{})[0])
		val = "Array(" + innerTyp + ")"
	case map[string]interface{}:
		val = "JSON"
	case float64:
		val = "Float64"
	case bool:
		val = "Bool"
	default:
		if reflect.TypeOf(req) == nil {
			elog.Warn("fieldTypeJudgment", elog.Any("type", reflect.TypeOf(req)))
			return "unknown"
		}
		return "unknown"
	}
	return val
}
