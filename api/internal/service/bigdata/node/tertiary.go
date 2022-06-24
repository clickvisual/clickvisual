package node

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type tertiary struct {
	next department
}

func (r *tertiary) execute(n *node) (res view.RespRunNode, err error) {
	if n.tertiaryDone {
		return
	}
	n.tertiaryDone = true
	switch n.n.Tertiary {
	case db.TertiaryClickHouse:
		return doTyClickHouse(n)
	case db.TertiaryMySQL:
		return doTyMySQL(n)
	case db.TertiaryOfflineSync:
	case db.TertiaryRealTimeSync:
		return doTyRealTimeSync(n)
	}
	return
}

func (r *tertiary) setNext(next department) {
	r.next = next
}
