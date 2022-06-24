package rtsync

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Creator(iid int, nodeId int, content string) (RTSync, error) {
	sc := view.SyncContent{}
	if err := json.Unmarshal([]byte(content), &sc); err != nil {
		return nil, err
	}
	if sc.Source.Typ == "mysql" && sc.Target.Typ == "clickhouse" {
		// mysql -> clickhouse
		return &MySQL2ClickHouse{iid: iid, nodeId: nodeId, sc: &sc}, nil
	}
	if sc.Source.Typ == "clickhouse" && sc.Target.Typ == "mysql" {
		// clickhouse -> mysql
		return &ClickHouse2MySQL{iid: iid, nodeId: nodeId, sc: &sc}, nil
	}
	return nil, constx.ErrBigdataRTSyncTypeNotSupported
}

type RTSync interface {
	Run() (map[string]string, error)
	Stop() error
}
