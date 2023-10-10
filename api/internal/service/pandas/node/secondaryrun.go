package node

import (
	"encoding/json"
	"strconv"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func doSyDashboard(n *node) (res view.RunNodeResult, err error) {
	dag := view.ReqDAG{}
	if err = json.Unmarshal([]byte(n.nc.Content), &dag); err != nil {
		return
	}
	dagFilter := dagEdgeFilter(dag)
	dagExecFlow := dagEdgeExecFlow(dagStart, dagFilter)
	res.DagFailedNodes = make(map[int]string, 0)
	_ = dagExec(dagExecFlow[0], n.uid, res.DagFailedNodes)
	if len(res.DagFailedNodes) > 0 {
		return res, constx.ErrDagExecFailed
	}
	return
}

// dagEdgeFilter: Through the node data to filter out the connection to the unreasonable operation
func dagEdgeFilter(req view.ReqDAG) (res []view.ReqDagEdge) {
	res = make([]view.ReqDagEdge, 0)
	nm := make(map[int]interface{})
	for _, n := range req.BoardNodeList {
		nm[n.Id] = struct{}{}
	}
	for _, e := range req.BoardEdges {
		// source
		si, _ := strconv.Atoi(e.Source)
		_, oks := nm[si]
		// target
		ti, _ := strconv.Atoi(e.Target)
		_, okt := nm[ti]
		if oks && okt {
			res = append(res, e)
		}
	}
	return
}

// DagEdgeExecFlow: by cords generate execution flow operation
func dagEdgeExecFlow(nodeId int, req []view.ReqDagEdge) (res []view.DagExecFlow) {
	// 找到开始节点
	children := make([]view.DagExecFlow, 0)
	for _, e := range req {
		s, _ := strconv.Atoi(e.Source)
		t, _ := strconv.Atoi(e.Target)
		if s == nodeId {
			if t == dagEnd {
				// 不再寻找子节点
				children = make([]view.DagExecFlow, 0)
			} else {
				children = append(children, dagEdgeExecFlow(t, req)...)
			}
		}
	}
	res = append(res, view.DagExecFlow{
		NodeId:   nodeId,
		Children: children,
	})
	return
}

func dagExec(req view.DagExecFlow, uid int, fns map[int]string) (err error) {
	// 进行日志记录
	if req.NodeId == dagStart {
		// 不执行相关操作
	} else {
		// 非开始节点
		if _, err = Run(req.NodeId, uid); err != nil {
			fns[req.NodeId] = err.Error()
			return errors.WithMessagef(err, "node id: %d", req.NodeId)
		}
	}
	// 执行子节点
	for _, child := range req.Children {
		if child.NodeId == dagEnd {
			// 执行到结束节点
			continue
		}
		if err = dagExec(child, uid, fns); err != nil {
			fns[child.NodeId] = err.Error()
			return errors.WithMessagef(err, "child: %v", child)
		}
	}
	return
}
