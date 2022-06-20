package node

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type node struct {
	n  *db.BigdataNode
	nc *db.BigdataNodeContent

	primaryDone   bool
	secondaryDone bool
	tertiaryDone  bool
}

type department interface {
	execute(*node) (view.RespRunNode, error)
	setNext(department)
}

func Run(n *db.BigdataNode, nc *db.BigdataNodeContent) (view.RespRunNode, error) {
	// Building chains of Responsibility
	t := &tertiary{}
	s := &secondary{next: t}
	p := &primary{next: s}
	return p.execute(&node{
		n:             n,
		nc:            nc,
		primaryDone:   false,
		secondaryDone: false,
		tertiaryDone:  false,
	})

}
