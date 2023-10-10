package node

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/ofsync"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/rtsync"
	"github.com/clickvisual/clickvisual/api/internal/service/source"
)

func doTyClickHouse(n *node) (res view.RunNodeResult, err error) {
	op, err := service.InstanceManager.Load(n.n.Iid)
	if err != nil {
		return
	}
	tmp, err := op.DoSQL(argsReplace(n.n.ID, n.nc.Content))
	if err != nil {
		return
	}
	res.Logs = tmp.Logs
	return
}

func doTyMySQL(n *node) (res view.RunNodeResult, err error) {
	s, err := db2.SourceInfo(invoker.Db, n.n.SourceId)
	if err != nil {
		return
	}
	tmp, err := source.Instantiate(&source.Source{
		URL:      s.URL,
		UserName: s.UserName,
		Password: s.Password,
		Typ:      s.Typ,
	}).Query(argsReplace(n.n.ID, n.nc.Content))
	if err != nil {
		return
	}
	res.Logs = tmp
	return
}

// doTyRealTimeSync ..
// support:
// clickhouse -> mysql
// mysql -> clickhouse
func doTyRealTimeSync(n *node) (res view.RunNodeResult, err error) {
	c, err := rtsync.Creator(n.n.Iid, n.n.ID, n.nc.Content)
	if err != nil {
		return
	}
	switch n.op {
	case OperatorRun:
		_ = db2.NodeUpdate(invoker.Db, n.n.ID, map[string]interface{}{"status": db2.NodeStatusHandler})
		res.InvolvedSQLs, err = c.Run()
	case OperatorStop:
		err = c.Stop()
		_ = db2.NodeUpdate(invoker.Db, n.n.ID, map[string]interface{}{"status": db2.NodeStatusDefault})
	default:
		err = constx.ErrBigdataRTSyncOperatorTypeNotSupported
	}
	if err != nil {
		_ = db2.NodeUpdate(invoker.Db, n.n.ID, map[string]interface{}{"status": db2.NodeStatusError})
		return
	}
	return res, nil
}

// doTyRealTimeSync ..
// support:
// clickhouse -> mysql
// mysql -> clickhouse
func doTyOfflineSync(n *node) (res view.RunNodeResult, err error) {
	c, err := ofsync.Creator(n.n.Iid, n.n.ID, n.nc.Content)
	if err != nil {
		return
	}
	switch n.op {
	case OperatorRun:
		_ = db2.NodeUpdate(invoker.Db, n.n.ID, map[string]interface{}{"status": db2.NodeStatusHandler})
		res.InvolvedSQLs, err = c.Run()
	case OperatorStop:
		err = c.Stop()
		_ = db2.NodeUpdate(invoker.Db, n.n.ID, map[string]interface{}{"status": db2.NodeStatusDefault})
	default:
		err = constx.ErrBigdataRTSyncOperatorTypeNotSupported
	}
	if err != nil {
		_ = db2.NodeUpdate(invoker.Db, n.n.ID, map[string]interface{}{"status": db2.NodeStatusError})
		return
	}
	return res, nil
}

// Make a variable substitution from the parameters of the task schedule
func argsReplace(nodeId int, sql string) (res string) {
	crontab, _ := db2.CrontabInfo(invoker.Db, nodeId)
	args := make([]view.ReqCrontabArg, 0)
	_ = json.Unmarshal([]byte(crontab.Args), &args)
	if len(args) == 0 {
		return sql
	}
	return argsReplaces(args, sql)
}

func argsReplaces(replaces []view.ReqCrontabArg, sql string) string {
	for _, r := range replaces {
		sql = strings.ReplaceAll(sql, fmt.Sprintf("${%s}", r.Key), r.Val)
	}
	return sql
}
