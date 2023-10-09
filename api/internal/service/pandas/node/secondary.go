package node

import (
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type secondary struct {
	next department
}

func (r *secondary) execute(n *node) (res view.RunNodeResult, err error) {
	if n.secondaryDone {
		return r.next.execute(n)
	}
	n.secondaryDone = true
	switch n.n.Secondary {
	case db.SecondaryAny:
	case db.SecondaryDatabase:
	case db.SecondaryDataIntegration:
	case db.SecondaryDataMining:
	case db.SecondaryDashboard:
		return doSyDashboard(n)
	default:
		return res, errors.Wrap(constx.ErrBigdataNotSupportNodeType, "secondary execute")
	}
	return r.next.execute(n)
}

func (r *secondary) setNext(next department) {
	r.next = next
}
