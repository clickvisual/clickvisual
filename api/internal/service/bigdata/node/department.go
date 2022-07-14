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

func Operator(n *db.BigdataNode, nc *db.BigdataNodeContent, op int, uid int) (view.RespRunNode, error) {
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
	execResultStr := string(execResultBytes)
	res := view.RespRunNode{
		Result: execResultStr,
	}
	// record update
	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	ups["result"] = execResultStr
	if op == OperatorRun {
		ups["previous_content"] = nc.Content
		if err = db.NodeResultCreate(tx, &db.BigdataNodeResult{
			NodeId:  n.ID,
			Content: nc.Content,
			Result:  execResultStr,
			Uid:     uid,
		}); err != nil {
			tx.Rollback()
			return res, err
		}
	}
	if err = db.NodeContentUpdate(invoker.Db, n.ID, ups); err != nil {
		tx.Rollback()
		return res, err
	}
	tx.Commit()
	return res, err
}
