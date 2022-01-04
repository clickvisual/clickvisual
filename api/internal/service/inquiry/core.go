package inquiry

import (
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type Operator interface {
	Databases() ([]view.RespDatabase, error)
	Tables(string) ([]string, error)

	Prepare(view.ReqQuery) view.ReqQuery
	GET(query view.ReqQuery) (view.RespQuery, error)
	Count(query view.ReqQuery) uint64
	GroupBy(param view.ReqQuery) (res map[string]uint64)
}
