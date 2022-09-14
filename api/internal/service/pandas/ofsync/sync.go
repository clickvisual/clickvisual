package ofsync

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	syncTypeUnknown int = iota
	syncTypeMySQL2ClickHouse
	syncTypeClickHouse2MySQL
)

func syncTypeJudgment(sc *view.SyncContent) int {
	if sc.Source.Typ == "mysql" && sc.Target.Typ == "clickhouse" {
		// mysql -> clickhouse
		return syncTypeMySQL2ClickHouse
	}
	if sc.Source.Typ == "clickhouse" && sc.Target.Typ == "mysql" {
		// clickhouse -> mysql
		return syncTypeClickHouse2MySQL
	}
	return syncTypeUnknown
}

func Creator(iid int, nodeId int, content string) (OfSync, error) {
	sc := view.SyncContent{}
	if err := json.Unmarshal([]byte(content), &sc); err != nil {
		return nil, err
	}
	switch syncTypeJudgment(&sc) {
	case syncTypeMySQL2ClickHouse:
		return &MySQL2ClickHouse{iid: iid, nodeId: nodeId, sc: &sc}, nil
	}
	return nil, constx.ErrBigdataRTSyncTypeNotSupported
}

type OfSync interface {
	Run() (map[string]string, error)
	Stop() error
}
