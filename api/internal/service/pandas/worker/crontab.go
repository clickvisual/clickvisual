package worker

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/robfig/cron/v3"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/alert/pusher"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/node"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/preempt"
)

const crontabUid = -1

var (
	CrontabRules *crontabRules
	ppt          *preempt.Preempt
	crontabFlag  bool
)

type crontabRules struct {
	crones sync.Map
}

// Init Gets the tasks that need to be performed
func Init() error {
	crontabFlag = true
	CrontabRules = &crontabRules{
		crones: sync.Map{},
	}
	xgo.Go(clear)
	// Support for multiple copies mode
	if econf.GetBool("app.isMultiCopy") {
		sf := func() { looper() }
		ef := func() { crontabFlag = false }
		ppt = preempt.NewPreempt(context.Background(), invoker.Redis, "clickvisual:worker", sf, ef)
		return nil
	}
	xgo.Go(looper)
	return nil
}

func Close() error {
	if econf.GetBool("app.isMultiCopy") {
		ppt.Close()
	}
	CrontabRules.crones.Range(func(k, v interface{}) bool {
		nodeId := k.(int)
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
		if !crontabFlag {
			continue
		}
		// Obtain the offline synchronization task to be executed
		// TODO Currently, only offline synchronization tasks can be detected
		var (
			crs []*db.BigdataCrontab
			err error
		)
		if crs, err = fetchNodeCrontabs(); err != nil {
			elog.Error("sync", elog.String("step", "nodes"), elog.String("error", err.Error()))
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
		if err := buildCronFn(n); err != nil {
			_ = db.CrontabUpdate(invoker.Db, n.NodeId, map[string]interface{}{"status": db.CrontabStatusWait})
			elog.Error("crontabRules", elog.String("step", "CrontabUpdate"), elog.String("error", err.Error()))
		}
	}
}

// Cron task trigger
func buildCronFn(cr *db.BigdataCrontab) (err error) {
	c := cron.New()
	spec := cr.Cron
	id, err := c.AddFunc(spec, func() {
		n, errNodeInfo := db.NodeInfo(invoker.Db, cr.NodeId)
		if errNodeInfo != nil {
			elog.Error("crontabRules", elog.String("step", "buildCronFn"),
				elog.Any("nodeId", cr.NodeId), elog.Any("err", errNodeInfo))
			return
		}
		nc, errNodeContentInfo := db.NodeContentInfo(invoker.Db, n.ID)
		if errNodeContentInfo != nil {
			elog.Error("crontabRules", elog.String("step", "buildCronFn"),
				elog.Any("nodeId", cr.NodeId), elog.Any("err", errNodeContentInfo))
			return
		}
		if cr.IsRetry == 1 {
			// return mode
			for i := 0; i < cr.RetryTimes; i++ {
				text := ""
				if res, errOperator := node.Operator(&n, &nc, node.OperatorRun, crontabUid); errOperator != nil {
					elog.Error("crontabRules", elog.String("step", "IsRetry"),
						elog.Any("nodeId", cr.NodeId), elog.Any("err", errOperator), elog.Any("res", res))
					time.Sleep(time.Duration(cr.RetryInterval) * time.Second)
					text = errOperator.Error()
				} else {
					elog.Info("crontabRules", elog.String("step", "IsRetryFinish"), elog.Any("nodeId", cr.NodeId),
						elog.Any("res", res))
					return
				}
				// 执行失败
				pushExec(cr.ChannelIds, text, n.Iid)
			}
			return
		}
		// do only once
		if res, errOperator := node.Operator(&n, &nc, node.OperatorRun, crontabUid); errOperator != nil {
			elog.Error("crontabRules", elog.String("step", "buildCronFn"),
				elog.Any("nodeId", cr.NodeId), elog.Any("err", errOperator), elog.Any("res", res))
			// 执行失败
			pushExec(cr.ChannelIds, errOperator.Error(), n.Iid)
			return
		}
	})
	if err != nil {
		elog.Error("crontabRules", elog.String("step", "buildCronFn"), elog.String("error", err.Error()))
		return
	}
	elog.Info("crontabRules", elog.String("step", "buildCronFn"), elog.Any("id", id))
	c.Start()
	_ = db.CrontabUpdate(invoker.Db, cr.NodeId, map[string]interface{}{"status": db.CrontabStatusDoing})
	CrontabRules.crones.Store(cr.NodeId, c)
	return
}

func pushExec(channelIds []int, text string, iid int) {
	_ = pusher.Execute(channelIds, &db.PushMsg{
		Title: "###  <font color=#FF0000>您有待处理的告警</font>\n",
		Text: fmt.Sprintf("Scheduled task execution failed: %s\n href: %s/bigdata?id=%d&navKey=TaskExecutionDetails\n",
			text, strings.TrimRight(econf.GetString("app.rootURL"), "/"), iid,
		),
	})
}
