package node

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type secondary struct {
	next department
}

func (r *secondary) execute(n *node) (res view.RespRunNode, err error) {
	if n.secondaryDone {
		r.next.execute(n)
		return
	}
	n.secondaryDone = true
	switch n.n.Secondary {
	case secondaryAny:
	case secondaryDatabase:
	case secondaryDataIntegration:
	case secondaryDataMining:
	}
	r.next.execute(n)
	return
}

func (r *secondary) setNext(next department) {
	r.next = next
}
