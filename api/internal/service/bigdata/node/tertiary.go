package node

import (
	"github.com/clickvisual/clickvisual/api/internal/service"
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
	case tertiaryClickHouse:
		return doTertiaryClickHouse(n)
	case tertiaryMySQL:
	case tertiaryOffline:
	case tertiaryRT:
	}
	return
}

func (r *tertiary) setNext(next department) {
	r.next = next
}

func doTertiaryClickHouse(n *node) (res view.RespRunNode, err error) {
	op, err := service.InstanceManager.Load(n.n.Iid)
	if err != nil {
		return
	}
	tmp, err := op.Complete(n.nc.Content)
	if err != nil {
		return
	}
	res.Logs = tmp.Logs
	return
}
