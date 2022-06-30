package node

import (
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type primary struct {
	next department
}

func (r *primary) execute(n *node) (res view.RunNodeResult, err error) {
	if n.primaryDone {
		r.next.execute(n)
		return
	}
	n.secondaryDone = true
	switch n.n.Primary {
	case db.PrimaryMining:
	case db.PrimaryShort:
	default:
		return res, constx.ErrBigdataNotSupportNodeType
	}
	return r.next.execute(n)
}

func (r *primary) setNext(next department) {
	r.next = next
}
