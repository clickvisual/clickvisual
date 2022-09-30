package node

import (
	"encoding/json"
	"time"

	"github.com/ego-component/egorm"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	OperatorRun int = iota
	OperatorStop
)

const (
	dagStart = -1
	dagEnd   = -2
)

type node struct {
	n  *db.BigdataNode
	nc *db.BigdataNodeContent

	op  int
	uid int

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
	res := view.RespRunNode{}

	now := time.Now()
	// record update
	tx := invoker.Db.Begin()
	// create result record
	nodeResult := db.BigdataNodeResult{
		NodeId:  n.ID,
		Content: nc.Content,
		Uid:     uid,
	}
	if errNodeCreate := db.NodeResultCreate(tx, &nodeResult); errNodeCreate != nil {
		tx.Rollback()
		return res, errors.WithMessage(errNodeCreate, "operator db node result create")
	}
	execResult, err := p.execute(&node{
		n:             n,
		nc:            nc,
		op:            op,
		uid:           uid,
		primaryDone:   false,
		secondaryDone: false,
		tertiaryDone:  false,
	})
	cost := time.Since(now).Milliseconds()
	execStatus := db.BigdataNodeResultUnknown
	if err != nil {
		execStatus = db.BigdataNodeResultFailed
		execResult.Message = err.Error()
	} else {
		execStatus = db.BigdataNodeResultSucc
		execResult.Message = "success"
	}
	if execResult.Logs == nil {
		execResult.Logs = make([]map[string]interface{}, 0)
	}
	// record execute result
	execResultBytes, _ := json.Marshal(execResult)
	execResultStr := string(execResultBytes)
	res.Result = execResultStr

	ups := make(map[string]interface{}, 0)
	ups["result"] = execResultStr
	if op == OperatorRun {
		ups["previous_content"] = nc.Content
		conds := egorm.Conds{}
		conds["result"] = execResultStr
		conds["cost"] = cost
		conds["status"] = execStatus
		if errNodeUpdate := db.NodeResultUpdate(tx, nodeResult.ID, conds); errNodeUpdate != nil {
			tx.Rollback()
			return res, errors.WithMessage(errNodeUpdate, "operator db node result update: "+execResult.Message)
		}
	}
	if errContentUpdate := db.NodeContentUpdate(invoker.Db, n.ID, ups); errContentUpdate != nil {
		tx.Rollback()
		return res, errors.WithMessage(errContentUpdate, "operator db node content update: "+execResult.Message)
	}
	tx.Commit()
	return res, err
}
