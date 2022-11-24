package service

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type node struct {
	// Task running status in the last 30 days
	Stats sync.Map
}

func NewNode() *node {
	n := &node{
		Stats: sync.Map{},
	}
	xgo.Go(func() {

		for {
			time.Sleep(time.Minute)
			n.SetStats(false)
		}
	})
	return n
}

// SetStats ...
// isInit true: Full data statistics are performed every time the service is started, including the data of the last 30 days
// isInit false: The system collects statistics of the current one hour every minute
// n.Stats.Store(nodeInfo.ID, nodeResultMap)
// nodeResultMap := make(map[string]view.WorkerStatsRow, 0)
func (n *node) SetStats(isInit bool) {
	nodes, _ := db.NodeListWithWorker()
	startTime := time.Now().Add(-time.Hour).Unix()
	key := hourPrecision(time.Now().Unix())
	for _, nodeInfo := range nodes {
		workerStatsRow := make(map[int64]view.WorkerStatsRow, 0)
		conds := egorm.Conds{}
		conds["node_id"] = nodeInfo.ID
		if !isInit {
			conds["ctime"] = egorm.Cond{
				Op:  ">=",
				Val: startTime,
			}
			if obj, ok := n.Stats.Load(nodeInfo.ID); ok {
				workerStatsRow = obj.(view.WorkerStats).Data
			}
		}
		nodeResults, _ := db.NodeResultList(conds)
		// Split the data by time point (hour)
		for _, result := range nodeResults {
			var stats view.WorkerStatsRow
			hour := hourPrecision(result.Ctime)
			if !isInit && hour != key {
				continue
			}
			if tmp, ok := workerStatsRow[hour]; ok {
				stats = tmp
			}
			switch result.Status {
			case db.BigdataNodeResultUnknown:
				stats.Unknown++
			case db.BigdataNodeResultSucc:
				stats.Success++
			case db.BigdataNodeResultFailed:
				stats.Failed++
			}
			workerStatsRow[hour] = stats
		}
		crontab, _ := db.CrontabInfo(invoker.Db, nodeInfo.ID)
		n.Stats.Store(nodeInfo.ID, view.WorkerStats{
			Iid:  nodeInfo.Iid,
			Uid:  crontab.DutyUid,
			Data: workerStatsRow,
		})
	}
}

func (n *node) WorkerDashboard(req view.ReqWorkerDashboard, uid int) (res view.RespWorkerDashboard) {
	start := hourPrecision(req.Start)
	end := hourPrecision(req.End)
	collectsFlow := make(map[int64]view.WorkerStatsRow)
	collectsNode := make(map[int]view.WorkerStatsRow)
	n.Stats.Range(func(nodeId, obj interface{}) bool {
		ws := obj.(view.WorkerStats)
		if ws.Iid != req.Iid {
			return true
		}
		if nodeId.(int) == 264 {
			fmt.Println(264)
		}
		if req.IsInCharge != 0 && ws.Uid != uid {
			return true
		}
		for timestamp, row := range ws.Data {
			if timestamp > end || start > timestamp {
				continue
			}
			// set flow
			flowItem := collectsFlow[timestamp]
			flowItem.Timestamp = timestamp
			flowItem.Success += row.Success
			flowItem.Failed += row.Failed
			flowItem.Unknown += row.Unknown
			collectsFlow[timestamp] = flowItem
			// set node
			nodeItem := collectsNode[nodeId.(int)]
			nodeItem.Success += row.Success
			nodeItem.Failed += row.Failed
			nodeItem.Unknown += row.Unknown
			collectsNode[nodeId.(int)] = nodeItem
		}
		return true
	})
	for _, row := range collectsFlow {
		res.WorkerFailed += row.Failed
		res.WorkerSuccess += row.Success
		res.WorkerUnknown += row.Unknown
		res.Flows = append(res.Flows, row)
	}
	sort.Slice(res.Flows, func(i, j int) bool {
		return res.Flows[i].Timestamp < res.Flows[j].Timestamp
	})
	for _, nodeStats := range collectsNode {
		if nodeStats.Failed > 0 {
			res.NodeFailed += 1
		} else if nodeStats.Success > 0 {
			res.NodeSuccess += 1
		} else {
			res.NodeUnknown += 1
		}
	}
	return res
}

func (n *node) NodeTryLock(uid, configId int, isForced bool) (err error) {
	var nodeInfo db.BigdataNode
	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&nodeInfo).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}
		if !isForced {
			if nodeInfo.LockUid != 0 && nodeInfo.LockUid != uid {
				tx.Rollback()
				return fmt.Errorf("failed to release the edit lock because another client is currently editing")
			}
		}
		err = tx.Model(&db.BigdataNode{}).Where("id = ?", nodeInfo.ID).Updates(map[string]interface{}{
			"lock_at":  time.Now().Unix(),
			"lock_uid": uid,
		}).Error
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "failed to get edit lock")
		}
	}
	return tx.Commit().Error
}

func (n *node) NodeUnlock(uid, configId int) (err error) {
	var nodeInfo db.BigdataNode
	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&nodeInfo).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}
		if nodeInfo.LockUid != 0 && nodeInfo.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("failed to release the edit lock because another client is currently editing")
		}
		err = tx.Model(&db.BigdataNode{}).Where("id = ?", nodeInfo.ID).Updates(map[string]interface{}{
			"lock_at":  nil,
			"lock_uid": 0,
		}).Error
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "failed to release edit lock")
		}
	}
	return tx.Commit().Error
}

func (n *node) NodeResultRespAssemble(nr *db.BigdataNodeResult) view.RespNodeResult {
	res := view.RespNodeResult{
		ID:           nr.ID,
		Ctime:        nr.Ctime,
		NodeId:       nr.NodeId,
		Content:      nr.Content,
		Result:       nr.Result,
		Cost:         nr.Cost,
		ExcelProcess: nr.ExcelProcess,
		Status:       nr.Status,
	}
	if nr.Uid == -1 {
		res.RespUserSimpleInfo = view.RespUserSimpleInfo{
			Uid:      -1,
			Username: "Crontab",
			Nickname: "Crontab",
		}
	} else {
		u, _ := db.UserInfo(nr.Uid)
		res.RespUserSimpleInfo.Gen(u)
	}
	return res
}

func (n *node) RespWorkerAssemble(nr *db.BigdataNodeResult) view.RespWorkerRow {
	nodeInfo, _ := db.NodeInfo(invoker.Db, nr.NodeId)
	nodeCrontabInfo, _ := db.CrontabInfo(invoker.Db, nr.NodeId)
	res := view.RespWorkerRow{
		NodeName:     nodeInfo.Name,
		Status:       nr.Status,
		Tertiary:     nodeInfo.Tertiary,
		Crontab:      nodeCrontabInfo.Cron,
		StartTime:    nr.Ctime,
		EndTime:      nr.Utime,
		ID:           nr.ID,
		NodeId:       nr.NodeId,
		Cost:         nr.Cost,
		ChargePerson: view.RespUserSimpleInfo{},
		Iid:          nodeInfo.Iid,
	}
	u, _ := db.UserInfo(nodeCrontabInfo.DutyUid)
	res.ChargePerson.Gen(u)
	return res
}

func hourPrecision(timestamp int64) int64 {
	t := time.Unix(timestamp, 0)
	return int64(int(timestamp) - t.Minute()*60 - t.Second())
}
