package sync

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// 竞争数据锁

// standalone

// 获取需要执行的任务，检测是否为单机模式，获取执行锁，

func InitSync() {
	// Obtain the offline synchronization task to be executed
	conds := egorm.Conds{}
	conds["status"] = db.NodeStatusWait
	conds["primary"] = db.PrimaryMining
	conds["secondary"] = db.SecondaryDataMining
	conds["tertiary"] = db.TertiaryOfflineSync
	nodes, err := db.NodeList(conds)
	if err != nil {
		invoker.Logger.Error("sync", elog.String("step", "nodes"), elog.String("error", err.Error()))
		return
	}
	// Construct an offline task execution function

	// Enter the task preempt state
}

// Cron task trigger
func buildCronFn() {
	// Cron task trigger

	// Minute-level data splitting

}

// Minute-level data splitting
func buildSplitFn() {

}

func core() {
	// 获取待执行状态的离线同步任务
	// no folder node
	for _, n := range nodes {
		nc, errNC := db.NodeContentInfo(invoker.Db, n.ID)
		if errNC != nil {
			invoker.Logger.Error("sync", elog.String("step", "nodeContent"), elog.String("error", errNC.Error()))
			continue
		}
		Insert(view.InnerNodeRun{
			N:  n,
			NC: &nc,
		})
	}
}

func InsertCron() {

}

func InsertHandler(n view.InnerNodeRun) {
	// 指定排序键

}
