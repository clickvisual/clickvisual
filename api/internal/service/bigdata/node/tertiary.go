package node

import (
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
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
	invoker.Logger.Debug("node", elog.String("content", n.nc.Content))
	tmp, err := op.Complete(n.nc.Content)
	if err != nil {
		invoker.Logger.Error("node", elog.String("step", "doTertiaryClickHouse"), elog.Any("err", err))
		return
	}
	invoker.Logger.Debug("node", elog.Any("tmp", tmp), elog.Any("err", err))
	res.Logs = tmp.Logs
	return
}
