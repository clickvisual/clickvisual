package node

import (
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type secondary struct {
	next department
}

func (r *secondary) execute(n *node) (res view.RunNodeResult, err error) {
	invoker.Logger.Debug("doSyDashboard", elog.Any("step", "secondary"), elog.Any("node", n.n))
	if n.secondaryDone {
		return r.next.execute(n)
	}
	invoker.Logger.Debug("doSyDashboard", elog.Any("step", "secondary"),
		elog.Any(" SecondaryDashboard", db.SecondaryDashboard),
		elog.Any(" n.n.Secondary", n.n.Secondary))
	n.secondaryDone = true
	switch n.n.Secondary {
	case db.SecondaryAny:
	case db.SecondaryDatabase:
	case db.SecondaryDataIntegration:
	case db.SecondaryDataMining:
	case db.SecondaryDashboard:
		invoker.Logger.Debug("doSyDashboard", elog.Any("step", "SecondaryDashboard"))
		return doSyDashboard(n)
	default:
		return res, constx.ErrBigdataNotSupportNodeType
	}
	return r.next.execute(n)
}

func (r *secondary) setNext(next department) {
	r.next = next
}
