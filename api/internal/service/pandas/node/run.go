package node

import (
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func Run(nodeId, uid int) (res view.RespRunNode, err error) {
	n, err := db2.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	if n.LockUid != uid && n.LockUid != 0 {
		u, _ := db2.UserInfo(n.LockUid)
		err = errors.Errorf("%s is editing %s", u.Nickname, n.Name)
		return
	}
	nc, err := db2.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		return
	}
	res, err = Operator(&n, &nc, OperatorRun, uid)
	if err != nil {
		return
	}
	afterNodeInfo, err := db2.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	res.Status = afterNodeInfo.Status
	return
}
