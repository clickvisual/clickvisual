package node

import (
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Run(nodeId, uid int) (res view.RespRunNode, err error) {
	n, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	if n.LockUid != uid && n.LockUid != 0 {
		u, _ := db.UserInfo(n.LockUid)
		err = errors.Errorf("%s is editing %s", u.Nickname, n.Name)
		return
	}
	nc, err := db.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		return
	}
	res, err = Operator(&n, &nc, OperatorRun, uid)
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
