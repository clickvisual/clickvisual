package dto

import (
	"fmt"
)

type ClusterInfo struct {
	Name          string            `json:"name"`
	MaxShardNum   int               `json:"hasShard"`   // 是否有分片
	MaxReplicaNum int               `json:"hasReplica"` // 是否有副本
	Hosts         []ClusterInfoHost `json:"hosts"`
}

func (c *ClusterInfo) Info() string {
	return fmt.Sprintf("%s(%d/%d)", c.Name, c.MaxShardNum, c.MaxReplicaNum)
}

type ClusterInfoHost struct {
	Host    string `json:"host"`
	Address string `json:"address"`
	Port    int    `json:"port"`
}
