package worker

import (
	"sync"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/elog"
	"github.com/robfig/cron/v3"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/node"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

const crontabUid = -1

var CrontabRules *crontabRules

type crontabRules struct {
	crones sync.Map
}

// Init Gets the tasks that need to be performed
func Init() error {
	CrontabRules = &crontabRules{
		crones: sync.Map{},
	}
	xgo.Go(looper)
	xgo.Go(clear)
	return nil
}

func Close() error {
	CrontabRules.crones.Range(func(k, v interface{}) bool {
		nodeId := k.(int)
		invoker.Logger.Debug("crontabRules", elog.String("step", "close"), elog.Any("nodeId", nodeId))
		_ = db.CrontabUpdate(invoker.Db, nodeId, map[string]interface{}{"status": db.CrontabStatusWait})
		c := v.(*cron.Cron)
		c.Stop()
		return true
	})
	return nil
}

func NodeCrontabStop(nodeId int) error {
	CrontabRules.crones.Range(func(k, v interface{}) bool {
		if k.(int) != nodeId {
			return true
		}
		invoker.Logger.Debug("crontabRules", elog.String("step", "stop"), elog.Any("nodeId", nodeId))
		c := v.(*cron.Cron)
		c.Stop()
		return true
	})
	return nil
}

func clear() {
	for {
		time.Sleep(time.Minute)
		db.NodeResultDelete30Days()
	}
}

func looper() {
	for {
		time.Sleep(time.Second * 3)
		// Obtain the offline synchronization task to be executed
		// TODO Currently, only offline synchronization tasks can be detected
		var (
			crs []*db.BigdataCrontab
			err error
		)
		if crs, err = fetchNodeCrontabs(); err != nil {
			invoker.Logger.Error("sync", elog.String("step", "nodes"), elog.String("error", err.Error()))
			continue
		}
		// Execute scheduling process: cron -> branch -> run
		dispatch(crs)
	}
}

func fetchNodeCrontabs() ([]*db.BigdataCrontab, error) {
	conds := egorm.Conds{}
	conds["status"] = db.CrontabStatusWait
	conds["typ"] = 0
	return db.CrontabList(conds)
}

// 执行调度流程，cron -> run
func dispatch(crontabs []*db.BigdataCrontab) {
	// 获取待执行状态的离线同步任务
	// no folder node
	for _, n := range crontabs {
		_ = db.CrontabUpdate(invoker.Db, n.NodeId, map[string]interface{}{"status": db.CrontabStatusPreempt})
		invoker.Logger.Debug("crontabRules", elog.String("step", "node"), elog.Any("crontabRule", n))
		if err := buildCronFn(n); err != nil {
			_ = db.CrontabUpdate(invoker.Db, n.NodeId, map[string]interface{}{"status": db.CrontabStatusWait})
			invoker.Logger.Error("sync", elog.String("step", "buildCronFn"), elog.String("error", err.Error()))
		}
	}
}

// Cron task trigger
func buildCronFn(cr *db.BigdataCrontab) (err error) {
	c := cron.New()
	// spec := "*/2 * * * *"
	// spec := "@every 10s"
	spec := cr.Cron
	id, err := c.AddFunc(spec, func() {
		n, errNodeInfo := db.NodeInfo(invoker.Db, cr.NodeId)
		if errNodeInfo != nil {
			invoker.Logger.Error("crontabRules", elog.String("step", "buildCronFn"),
				elog.Any("nodeId", cr.NodeId), elog.Any("err", errNodeInfo))
			return
		}
		nc, errNodeContentInfo := db.NodeContentInfo(invoker.Db, n.ID)
		if errNodeContentInfo != nil {
			invoker.Logger.Error("crontabRules", elog.String("step", "buildCronFn"),
				elog.Any("nodeId", cr.NodeId), elog.Any("err", errNodeContentInfo))
			return
		}
		res, errOperator := node.Operator(&n, &nc, node.OperatorRun, crontabUid)
		if errOperator != nil {
			invoker.Logger.Error("crontabRules", elog.String("step", "buildCronFn"),
				elog.Any("nodeId", cr.NodeId), elog.Any("err", errOperator), elog.Any("res", res))
			return
		}
	})
	if err != nil {
		invoker.Logger.Error("crontabRules", elog.String("step", "buildCronFn"), elog.String("error", err.Error()))
		return
	}
	invoker.Logger.Debug("crontabRules", elog.String("step", "buildCronFn"), elog.Any("id", id))
	c.Start()
	_ = db.CrontabUpdate(invoker.Db, cr.NodeId, map[string]interface{}{"status": db.CrontabStatusDoing})
	CrontabRules.crones.Store(cr.NodeId, c)
	return
}
