package inquiry

import (
	"fmt"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func genDatabendTimeCondition(param view.ReqQuery) string {
	return fmt.Sprintf("%s >= to_timestamp(%s) AND %s < to_timestamp(%s)", param.TimeField, "%d", param.TimeField, "%d")
}

func genDatabendTimeConditionEqual(param view.ReqQuery, t time.Time) string {
	switch param.TimeFieldType {
	case db.TimeFieldTypeDT:
		return fmt.Sprintf("to_timestamp(%s) = %d", param.TimeField, t.Unix())
	case db.TimeFieldTypeDT3:
		return fmt.Sprintf("%s = to_timestamp(%f, 3)", param.TimeField, float64(t.UnixMilli())/1000.0)
	case db.TimeFieldTypeTsMs:
		return fmt.Sprintf("%s = %d", param.TimeField, t.UnixMilli())
	}
	return fmt.Sprintf("%s = %d", param.TimeField, t.Unix())
}
