package node

import (
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type primary struct {
	next department
}

func (r *primary) execute(n *node) (res view.RunNodeResult, err error) {
	if n.primaryDone {
		_, _ = r.next.execute(n)
		return
	}
	n.primaryDone = true
	switch n.n.Primary {
	case db.PrimaryMining:
	case db.PrimaryShort:
	default:
		return res, errors.Wrap(constx.ErrBigdataNotSupportNodeType, "primary execute")
	}
	return r.next.execute(n)
}

func (r *primary) setNext(next department) {
	r.next = next
}
