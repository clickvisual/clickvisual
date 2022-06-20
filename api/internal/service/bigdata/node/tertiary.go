package node

import (
	"encoding/json"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type tertiary struct {
	next department
}

func (r *tertiary) execute(n *node) (res view.RespRunNode, err error) {
	if n.tertiaryDone {
		return
	}
	n.tertiaryDone = true
	switch n.n.Tertiary {
	case db.TertiaryClickHouse:
		return doTyClickHouse(n)
	case db.TertiaryMySQL:
	case db.TertiaryOfflineSync:
		// Data Synchronization Process
		// clickhouse -> mysql
		// mysql -> clickhouse
		return doTyOfflineSync(n)
	case db.TertiaryRealTimeSync:
	}
	return
}

func (r *tertiary) setNext(next department) {
	r.next = next
}

func doTyClickHouse(n *node) (res view.RespRunNode, err error) {
	op, err := service.InstanceManager.Load(n.n.Iid)
	if err != nil {
		return
	}
	invoker.Logger.Debug("node", elog.String("content", n.nc.Content))
	tmp, err := op.Complete(n.nc.Content)
	if err != nil {
		invoker.Logger.Error("node", elog.String("step", "doTyClickHouse"), elog.Any("err", err))
		return
	}
	invoker.Logger.Debug("node", elog.Any("tmp", tmp), elog.Any("err", err))
	res.Logs = tmp.Logs
	return
}

func doTyOfflineSync(n *node) (res view.RespRunNode, err error) {
	os := view.OfflineContent{}
	if err = json.Unmarshal([]byte(n.nc.Content), &os); err != nil {
		return
	}
	if os.Source.Typ == "mysql" && os.Target.Typ == "clickhouse" {
		// mysql -> clickhouse

	} else if os.Source.Typ == "clickhouse" && os.Target.Typ == "mysql" {
		// clickhouse -> mysql

	}
	return
}

func doTyOfflineSyncMySQL2ClickHouse() {
	// INSERT INTO [db.]table [(c1, c2, c3)] select 列或者* from mysql('host:port', 'db', 'table_name', 'user', 'password')

}
