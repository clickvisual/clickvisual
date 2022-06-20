package node

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type secondary struct {
	next department
}

func (r *secondary) execute(n *node) (res view.RespRunNode, err error) {
	if n.secondaryDone {
		return r.next.execute(n)
	}
	n.secondaryDone = true
	switch n.n.Secondary {
	case db.SecondaryAny:
	case db.SecondaryDatabase:
	case db.SecondaryDataIntegration:
	case db.SecondaryDataMining:
	}
	return r.next.execute(n)
}

func (r *secondary) setNext(next department) {
	r.next = next
}
