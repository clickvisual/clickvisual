package rtsync

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type MySQL2ClickHouse struct {
	iid    int
	nodeId int
	sc     *view.SyncContent
}

// Run
// MaterializeMySQL
// CREATE DATABASE [IF NOT EXISTS] db_name [ON CLUSTER cluster]
// ENGINE = MySQL('host:port', 'database', 'user', 'password')
func (c *MySQL2ClickHouse) Run() (map[string]string, error) {
	return nil, nil
}

func (c *MySQL2ClickHouse) Stop() error {
	return nil
}
