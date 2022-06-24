package dispatcher

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/elog"
	"github.com/robfig/cron/v3"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/transform"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

var Dispatcher *dispatcher

type dispatcher struct {
	crones sync.Map
}

// Init Gets the tasks that need to be performed
func Init() {
	Dispatcher = &dispatcher{
		crones: sync.Map{},
	}
	xgo.Go(looper)
}

func Close() error {
	Dispatcher.crones.Range(func(k, v interface{}) bool {
		nodeId := k.(int)
		_ = db.NodeUpdate(invoker.Db, nodeId, map[string]interface{}{"status": db.NodeStatusWaitCron})
		c := v.(*cron.Cron)
		c.Stop()
		return true
	})
	return nil
}

func looper() {
	for {
		time.Sleep(time.Second * 3)
		// Obtain the offline synchronization task to be executed
		// TODO Currently, only offline synchronization tasks can be detected
		var (
			nodes []*db.BigdataNode
			err   error
		)
		if nodes, err = fetchNodes(); err != nil {
			invoker.Logger.Error("sync", elog.String("step", "nodes"), elog.String("error", err.Error()))
			return
		}
		invoker.Logger.Debug("dispatcher", elog.Any("nodes", nodes))
		// Execute scheduling process: cron -> branch -> run
		dispatch(nodes)
	}
}

func fetchNodes() ([]*db.BigdataNode, error) {
	conds := egorm.Conds{}
	conds["status"] = db.NodeStatusWaitCron
	conds["primary"] = db.PrimaryMining
	conds["secondary"] = db.SecondaryDataMining
	conds["tertiary"] = db.TertiaryOfflineSync
	nodes, err := db.NodeList(conds)
	return nodes, err
}

// 执行调度流程，cron -> run
func dispatch(nodes []*db.BigdataNode) {
	// 获取待执行状态的离线同步任务
	// no folder node
	for _, n := range nodes {
		nc, errNC := db.NodeContentInfo(invoker.Db, n.ID)
		if errNC != nil {
			invoker.Logger.Error("sync", elog.String("step", "nodeContent"), elog.String("error", errNC.Error()))
			continue
		}
		var oc view.SyncContent
		_ = json.Unmarshal([]byte(nc.Content), &oc)
		_ = db.NodeUpdate(invoker.Db, n.ID, map[string]interface{}{"status": db.NodeStatusWaitHandler})
		xgo.Go(func() {
			invoker.Logger.Debug("dispatcher", elog.String("step", "node"), elog.Any("node", n), elog.Any("oc", oc))
			err := buildCronFn(n.ID, oc)
			if err != nil {
				executeFailed(n.ID, err.Error())
				invoker.Logger.Error("sync", elog.String("step", "buildCronFn"), elog.String("error", errNC.Error()))
			}
		})
	}
}

func executeFailed(nodeId int, reason string) {
	_ = db.NodeUpdate(invoker.Db, nodeId, map[string]interface{}{"status": db.NodeStatusError})
	_ = db.NodeStatusUpdate(invoker.Db, nodeId, map[string]interface{}{"reason": reason})
}

// Cron task trigger
func buildCronFn(nodeId int, oc view.SyncContent) (err error) {
	// Cron task trigger
	// Minute-level data splitting
	c := cron.New()
	// spec := "*/2 * * * *"
	spec := "@every 10s"
	id, err := c.AddFunc(spec, func() {
		buildBranchFn(nodeId, oc)
	})
	if err != nil {
		invoker.Logger.Error("dispatcher", elog.String("step", "buildCronFn"), elog.String("error", err.Error()), elog.Any("oc", oc))
		return
	}
	invoker.Logger.Debug("dispatcher", elog.String("step", "buildCronFn"), elog.Any("id", id))
	c.Start()
	Dispatcher.crones.Store(nodeId, c)
	return
}

// Minute-level data splitting
func buildBranchFn(nodeId int, oc view.SyncContent) {
	// start handler
	invoker.Logger.Debug("dispatcher", elog.String("step", "NodeStatusHandler"), elog.Any("nodeId", nodeId))
	_ = db.NodeUpdate(invoker.Db, nodeId, map[string]interface{}{"status": db.NodeStatusHandler})
	var (
		t *transform.Transform
	)
	if oc.Source.Typ == "clickhouse" && oc.Target.Typ == "mysql" {
		// // 开始执行单次任务
		t = transform.NewTransform(&transform.ClickHouse2Mysql{},
			oc.Source.SourceTimeField,
			oc.Source.SourceTimeFieldTyp,
			time.Now().Add(-time.Hour*24).Unix(),
			time.Now().Unix(),
		)
	} else {
		executeFailed(nodeId, "notSupportedType")
		invoker.Logger.Error("dispatcher", elog.String("error", "notSupportedType"), elog.Any("oc", oc))
	}
	if t == nil {
		executeFailed(nodeId, "notSupportedType")
		invoker.Logger.Error("dispatcher", elog.String("error", "notSupportedType"), elog.Any("oc", oc))
	}
	buildRunFn(nodeId, t)
}

// Minute-level data splitting
func buildRunFn(nodeId int, t *transform.Transform) {
	if err := t.Run(nodeId); err != nil {
		executeFailed(nodeId, err.Error())
		invoker.Logger.Error("dispatcher", elog.String("step", "run"), elog.String("error", err.Error()))
	} else {
		invoker.Logger.Debug("dispatcher", elog.String("step", "NodeStatusFinish"), elog.Any("nodeId", nodeId))
		_ = db.NodeUpdate(invoker.Db, nodeId, map[string]interface{}{"status": db.NodeStatusFinish})
	}
}
