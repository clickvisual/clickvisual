package node

import (
	"errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func NodeRun(nodeId, uid int) (res view.RespRunNode, err error) {
	n, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	if n.LockUid != uid {
		err = errors.New("please get the node lock and try again")
		return
	}
	nc, err := db.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		return
	}
	res, err = Operator(&n, &nc, OperatorRun)
	if err != nil {
		return
	}
	afterNodeInfo, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	res.Status = afterNodeInfo.Status
	return
}
