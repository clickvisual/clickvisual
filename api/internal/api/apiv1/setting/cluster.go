package setting

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"
	"go.uber.org/zap"
	"sigs.k8s.io/yaml"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
)

// ClusterInfo   集群信息
// @Tags         SYSTEM
func ClusterInfo(c *core.Context) {
	var (
		err  error
		info db.Cluster
	)
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "IsRootUser: "+err.Error(), nil)
		return
	}
	clusterId := cast.ToInt(c.Param("id"))
	if clusterId == 0 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	info, err = db.ClusterInfo(clusterId)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(info)
}

// ClusterPageList 根据分页获取Cluster列表
// @Tags         SYSTEM
func ClusterPageList(c *core.Context) {
	req := &db.ReqPage{}
	if err := c.Bind(req); err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "IsRootUser: "+err.Error(), nil)
		return
	}
	query := egorm.Conds{}
	if v := c.Query("name"); v != "" {
		query["name"] = egorm.Cond{
			Op:  "like",
			Val: v,
		}
	}
	total, list := db.ClusterListPage(query, req)
	c.JSONPage(list, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
}

// ClusterCreate ...
// @Tags         SYSTEM
// @Summary		 创建集群
func ClusterCreate(c *core.Context) {
	var err error
	params := view.ReqCreateCluster{}
	err = c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "IsRootUser: "+err.Error(), nil)
		return
	}
	// check the format of kubeConfig which submitted from frontend
	params.KubeConfig, err = getJsonStr(params.KubeConfig)
	if err != nil {
		c.JSONE(1, "KubeConfig format error: ", err)
		return
	}
	obj := db.Cluster{
		Name:        params.Name,
		Description: params.Description,
		Status:      params.Status,
		ApiServer:   strings.TrimSpace(params.ApiServer),
	}
	obj.KubeConfig = obj.SetKubeConfig(strings.TrimSpace(params.KubeConfig))
	if err = db.ClusterCreate(invoker.Db, &obj); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.ClusterCMDB(c.User(), db.OpnClustersCreate, map[string]interface{}{"param": params})
	c.JSONOK()
}

// ClusterUpdate 更新Cluster数据
// @Tags         SYSTEM
func ClusterUpdate(c *core.Context) {
	var err error
	clusterId := cast.ToInt(c.Param("id"))
	if clusterId < 1 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	params := view.ReqCreateCluster{}
	err = c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "IsRootUser: "+err.Error(), nil)
		return
	}
	// make sure the format of kubeConfig is json.
	obj := db.Cluster{}
	params.KubeConfig, err = getJsonStr(params.KubeConfig)
	if err != nil {
		c.JSONE(1, "KubeConfig format error: ", err)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["name"] = params.Name
	ups["description"] = params.Description
	ups["status"] = params.Status
	ups["api_server"] = params.ApiServer
	ups["kube_config"] = obj.SetKubeConfig(params.KubeConfig)
	err = db.ClusterUpdate(invoker.Db, clusterId, ups)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.ClusterCMDB(c.User(), db.OpnClustersUpdate, map[string]interface{}{"param": params})
	c.JSONOK()
}

// ClusterDelete 删除数据
// @Tags         SYSTEM
func ClusterDelete(c *core.Context) {
	var (
		err error
	)
	clusterId := cast.ToInt(c.Param("id"))
	if clusterId == 0 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "IsRootUser: "+err.Error(), nil)
		return
	}
	clusterInfo, _ := db.ClusterInfo(clusterId)
	err = db.ClusterDelete(invoker.Db, clusterId)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.ClusterCMDB(c.User(), db.OpnClustersDelete, map[string]interface{}{"clusterInfo": clusterInfo})
	c.JSONOK()
}

// private
// function.convert yaml to json if 'jsonOrYaml' is yaml format
func getJsonStr(jsonOrYaml string) (jsonStr string, err error) {
	var js map[string]interface{}
	if json.Unmarshal([]byte(jsonOrYaml), &js) == nil {
		// is json string, so just return.
		return jsonOrYaml, nil
	}
	jsonBytes, err := yaml.YAMLToJSON([]byte(jsonOrYaml))
	if err != nil {
		elog.Warn("Parse yaml to json failed", zap.Error(err))
		return "", fmt.Errorf("Use Json or Yaml format! ")
	}
	return string(jsonBytes), nil
}
