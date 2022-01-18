package inquiry

import (
	"fmt"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/pkg/constx"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type Operator interface {
	Databases() ([]view.RespDatabase, error)
	Tables(string) ([]string, error)

	Prepare(view.ReqQuery) (view.ReqQuery, error)
	GET(query view.ReqQuery) (view.RespQuery, error)
	Count(query view.ReqQuery) uint64
	GroupBy(param view.ReqQuery) (res map[string]uint64)
}

var queryOperatorArr = []string{"=", "!=", "<", "<=", ">", ">=", "~"}

type queryItem struct {
	Key      string
	Operator string
	Value    string
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
	for _, a := range strings.Split(in, "and") {
		for _, op := range queryOperatorArr {
			if err := queryEncodeOperation(a, op, &res); err != nil {
				return nil, err
			}
		}
	}
	elog.Debug("queryEncode", elog.Any("step", "finish"), elog.Any("items", res))
	return res, nil
}

func queryDecode(in []queryItem) (out string) {
	for index, item := range in {
		if item.Operator == "~" {
			item.Operator = " like "
		}
		if item.Key == "_time_" {
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
	opArr := strings.Split(strings.TrimSpace(a), op)
	if len(opArr) != 2 {
		return constx.ErrQueryFormatIllegal
	}
	if strings.Contains(strings.TrimSpace(opArr[1]), " ") {
		return constx.ErrQueryFormatIllegal
	}
	*res = append(*res, queryItem{
		Key:      opArr[0],
		Operator: op,
		Value:    opArr[1],
	})
	return nil
}
