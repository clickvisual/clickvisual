package kube

import (
	"github.com/ego-component/egorm"

	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

// ClusterList 根据分页获取Cluster列表
// @Tags         KUBE
func ClusterList(c *core.Context) {
	res, err := db.ClusterListHideSensitiveInfo(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(res)
}
