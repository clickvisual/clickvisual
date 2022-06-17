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

const (
	primaryMining = 1
	primaryShort  = 3
)

const (
	secondaryAny             = 0
	secondaryDatabase        = 1
	secondaryDataIntegration = 2
	secondaryDataMining      = 3
)

const (
	tertiaryClickHouse = 10
	tertiaryMySQL      = 11
	tertiaryOffline    = 20
	tertiaryRT         = 21
)

func Run(n *db.BigdataNode, nc *db.BigdataNodeContent) (err error) {
	// Building chains of Responsibility
	t := &tertiary{}
	s := &secondary{next: t}
	p := &primary{next: s}
	p.execute(&node{
		n:             n,
		nc:            nc,
		primaryDone:   false,
		secondaryDone: false,
		tertiaryDone:  false,
	})
	return
}
