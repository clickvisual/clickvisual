package kube

import (
	"fmt"
	"sort"
	"strings"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"
	corev1 "k8s.io/api/core/v1"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/api"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

// ConfigMapList Get configmap by name
func ConfigMapList(c *core.Context) {
	clusterId := cast.ToInt(c.Param("clusterId"))
	if clusterId == 0 {
		c.JSONE(core.CodeErr, "参数无效", nil)
		return
	}
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		c.JSONE(core.CodeErr, "集群数据获取失败"+err.Error(), err)
		return
	}
	namespaces, err := client.KubeClient.List(api.ResourceNameNamespace, "", "")
	if err != nil {
		c.JSONE(core.CodeErr, "集群数据获取失败"+err.Error(), err)
		return
	}
	resp := make([]view.RespNamespaceConfigmaps, 0)

	filter := make(map[string]interface{})

	conds := egorm.Conds{}
	conds["cluster_id"] = clusterId
	dbConfigmaps, _ := db.K8SConfigMapListX(conds)
	nscm := make(map[string][]view.RespConfigmap)
	for _, cm := range dbConfigmaps {
		if _, ok := nscm[cm.Namespace]; !ok {
			nscm[cm.Namespace] = make([]view.RespConfigmap, 0)
		}
		nscm[cm.Namespace] = append(nscm[cm.Namespace], view.RespConfigmap{
			Name: cm.Name,
		})
		filter[fmt.Sprintf("%d|%s|%s", clusterId, cm.Namespace, cm.Name)] = struct{}{}
	}

	for _, obj := range namespaces {
		ns := *(obj.(*corev1.Namespace))
		elog.Debug("namespace", elog.Any("ns", ns))
		configmaps, errConfigs := client.KubeClient.List(api.ResourceNameConfigMap, ns.Name, "")
		if errConfigs != nil {
			elog.Error("configmaps", elog.String("err", errConfigs.Error()))
			continue
		}
		for _, configMapObj := range configmaps {
			cm := *(configMapObj.(*corev1.ConfigMap))
			if _, ok := filter[fmt.Sprintf("%d|%s|%s", clusterId, cm.Namespace, cm.Name)]; ok {
				continue
			}
			if _, ok := nscm[cm.Namespace]; !ok {
				nscm[cm.Namespace] = make([]view.RespConfigmap, 0)
			}
			nscm[cm.Namespace] = append(nscm[cm.Namespace], view.RespConfigmap{
				Name: cm.Name,
			})
		}
	}

	for namespace, respConfigMap := range nscm {
		if len(respConfigMap) > 0 {
			resp = append(resp, view.RespNamespaceConfigmaps{
				Namespace:  namespace,
				Configmaps: respConfigMap,
			})
		}
	}
	sort.Slice(resp, func(i, j int) bool { return len(resp[i].Configmaps) > len(resp[j].Configmaps) })
	c.JSONOK(resp)
}

// ConfigMapCreate Get configmap by name
func ConfigMapCreate(c *core.Context) {
	clusterId := cast.ToInt(c.Param("clusterId"))
	if clusterId == 0 {
		c.JSONE(core.CodeErr, "参数无效", nil)
		return
	}
	param := view.ReqCreateConfigMap{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	// Gets the configmap ID
	obj := db.K8SConfigMap{
		ClusterId: clusterId,
		Name:      param.ConfigmapName,
		Namespace: param.Namespace,
	}
	resp, err := db.K8SConfigMapLoadOrSave(invoker.Db, &obj)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// ConfigMapInfo Get configmap by name
func ConfigMapInfo(c *core.Context) {
	clusterId := cast.ToInt(c.Param("clusterId"))
	namespace := strings.TrimSpace(c.Param("namespace"))
	name := strings.TrimSpace(c.Param("name"))
	if clusterId == 0 || namespace == "" || name == "" {
		c.JSONE(core.CodeErr, "参数错误", nil)
		return
	}
	param := view.ReqConfigMapInfo{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		c.JSONE(core.CodeErr, "集群数据获取失败："+err.Error(), nil)
		return
	}
	elog.Debug("ConfigMapInfo", elog.Int("clusterId", clusterId), elog.String("namespace", namespace), elog.String("name", name))
	obj, err := client.KubeClient.Get(api.ResourceNameConfigMap, namespace, name)
	if err != nil {
		c.JSONE(core.CodeErr, "configmap 数据读取失败："+err.Error(), nil)
		return
	}
	cm := obj.(*corev1.ConfigMap)
	var (
		upstreamValue string
		// mogoValue     string
	)
	for k, v := range cm.Data {
		if k == param.Key {
			upstreamValue = v
			break
		}
	}
	c.JSONOK(upstreamValue)
}
