package transform

import (
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

const (
	timeFieldTypInt  = 1
	timeFieldTypTime = 2
)

type Transform struct {
	algo         algo
	start        int64
	end          int64
	timeField    string
	timeFieldTyp int
}

func NewTransform(a algo, timeField string, timeFieldTyp int, st, et int64) *Transform {
	return &Transform{
		algo:         a,
		start:        st,
		end:          et,
		timeField:    timeField,
		timeFieldTyp: timeFieldTyp,
	}
}

func (t *Transform) setAlgo(a algo) {
	t.algo = a
}

func (t *Transform) setPeriod(st, et int64) {
	t.end = et
	t.start = st
}

// Run ...
// 用时间字段肯定会涉及时间类型：int、time.Time
// 用分钟进行拆分，一天可以拆分为 720 次 RUN
func (t *Transform) Run(nodeId int) (err error) {
	ns := db.BigdataNodeStatus{
		NodeId: nodeId,
	}
	if err = db.NodeStatusCreate(invoker.Db, &ns); err != nil {
		return
	}
	t.algo.transform(t)
	for i := 0; i < 10; i++ {
		invoker.Logger.Debug("dispatcher", elog.String("step", "executing"), elog.Any("nodeId", nodeId),
			elog.Any("i", i), elog.Any("nsId", ns.ID))
		if err = db.NodeStatusUpdate(invoker.Db, ns.ID, map[string]interface{}{"total": 30, "handled": i}); err != nil {
			return
		}
		time.Sleep(time.Second)
	}
	return nil
}
