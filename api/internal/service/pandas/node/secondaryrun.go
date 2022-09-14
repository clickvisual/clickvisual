package node

import (
	"encoding/json"
	"strconv"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func doSyDashboard(n *node) (res view.RunNodeResult, err error) {
	dag := view.ReqDAG{}
	if err = json.Unmarshal([]byte(n.nc.Content), &dag); err != nil {
		return
	}
	invoker.Logger.Debug("doSyDashboard", elog.Any("dag", dag))
	dagFilter := dagEdgeFilter(dag)
	invoker.Logger.Debug("doSyDashboard", elog.Any("dagFilter", dagFilter))
	dagExecFlow := dagEdgeExecFlow(dagStart, dagFilter)
	invoker.Logger.Debug("doSyDashboard", elog.Any("dagExecFlow", dagExecFlow))
	res.DagFailedNodes = make(map[int]string, 0)
	_ = dagExec(dagExecFlow[0], n.uid, res.DagFailedNodes)
	if len(res.DagFailedNodes) > 0 {
		return res, constx.ErrDagExecFailed
	}
	invoker.Logger.Debug("doSyDashboard", elog.Any("res", res))
	return
}

// 通过 node 数据过滤掉不合理的连线操作
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

// 通过连线操作生成执行流
func dagEdgeExecFlow(nodeId int, req []view.ReqDagEdge) (res []view.DagExecFlow) {
	// 找到开始节点
	children := make([]view.DagExecFlow, 0)
	invoker.Logger.Debug("doSyDashboard", elog.Any("step", "start"), elog.Any("startNode", nodeId),
		elog.Any("req", req))
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
	invoker.Logger.Debug("doSyDashboard", elog.Any("step", "doing"),
		elog.Any("endNode", nodeId), elog.Any("children", children))
	res = append(res, view.DagExecFlow{
		NodeId:   nodeId,
		Children: children,
	})
	return
}

func dagExec(req view.DagExecFlow, uid int, fns map[int]string) (err error) {
	// 执行当前节点
	if req.NodeId == dagStart {
		// 不执行相关操作，进行日志记录
		invoker.Logger.Info("dagExec", elog.String("step", "start"), elog.Any("req", req),
			elog.Int("uid", uid))
	} else {
		// 非开始节点
		_, err = Run(req.NodeId, uid)
	}
	if err != nil {
		fns[req.NodeId] = err.Error()
		invoker.Logger.Error("dagExec", elog.String("step", "run"), elog.Any("NodeId", req.NodeId),
			elog.Any("err", err))
		return
	}
	// 执行子节点
	for _, child := range req.Children {
		if child.NodeId == dagEnd {
			// 执行到结束节点
			continue
		}
		if err = dagExec(child, uid, fns); err != nil {
			fns[child.NodeId] = err.Error()
			invoker.Logger.Error("dagExec", elog.String("step", "child"), elog.Any("child", child),
				elog.Any("err", err))
			return
		}
	}
	return
}
