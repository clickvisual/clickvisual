package node

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	OperatorRun int = iota
	OperatorStop
)

type node struct {
	n  *db.BigdataNode
	nc *db.BigdataNodeContent

	op int

	primaryDone   bool
	secondaryDone bool
	tertiaryDone  bool
}

type department interface {
	execute(*node) (view.RunNodeResult, error)
	setNext(department)
}

func Operator(n *db.BigdataNode, nc *db.BigdataNodeContent, op int) (view.RespRunNode, error) {
	// Building chains of Responsibility
	t := &tertiary{}
	s := &secondary{next: t}
	p := &primary{next: s}
	execResult, err := p.execute(&node{
		n:             n,
		nc:            nc,
		op:            op,
		primaryDone:   false,
		secondaryDone: false,
		tertiaryDone:  false,
	})
	if err != nil {
		execResult.Message = err.Error()
	} else {
		execResult.Message = "success"
	}
	if execResult.Logs == nil {
		execResult.Logs = make([]map[string]interface{}, 0)
	}
	// record execute result
	execResultBytes, _ := json.Marshal(execResult)
	ups := make(map[string]interface{}, 0)
	ups["result"] = string(execResultBytes)
	if op == OperatorRun {
		ups["previous_content"] = nc.Content
	}
	_ = db.NodeContentUpdate(invoker.Db, n.ID, ups)
	res := view.RespRunNode{
		Result: string(execResultBytes),
	}
	return res, err
}
