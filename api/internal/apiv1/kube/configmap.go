package kube

import (
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
	for _, obj := range namespaces {
		ns := *(obj.(*corev1.Namespace))
		elog.Debug("namespace", elog.Any("ns", ns))
		configmaps, errConfigs := client.KubeClient.List(api.ResourceNameConfigMap, ns.Name, "")
		if errConfigs != nil {
			elog.Error("configmaps", elog.String("err", errConfigs.Error()))
			continue
		}
		respConfigMap := make([]view.RespConfigmap, 0)
		for _, configMapObj := range configmaps {
			cm := *(configMapObj.(*corev1.ConfigMap))
			respConfigMap = append(respConfigMap, view.RespConfigmap{
				Name: cm.Name,
			})
		}
		resp = append(resp, view.RespNamespaceConfigmaps{
			Namespace:  ns.Name,
			Configmaps: respConfigMap,
		})
	}
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
		Name:      param.Name,
		Namespace: param.Namespace,
	}
	resp, err := db.K8SConfigMapLoadOrSave(invoker.Db, &obj)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}
