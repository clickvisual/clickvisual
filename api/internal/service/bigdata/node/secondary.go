package node

import (
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
	case secondaryAny:
	case secondaryDatabase:
	case secondaryDataIntegration:
	case secondaryDataMining:
	}
	return r.next.execute(n)
}

func (r *secondary) setNext(next department) {
	r.next = next
}
