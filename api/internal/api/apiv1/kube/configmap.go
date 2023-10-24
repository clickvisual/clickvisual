package kube

import (
	"fmt"
	"sort"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"
	corev1 "k8s.io/api/core/v1"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube/api"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube/resource"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
)

// ConfigMapList Get configmap by name
// @Tags         KUBE
func ConfigMapList(c *core.Context) {
	clusterId := cast.ToInt(c.Param("clusterId"))
	if clusterId == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		c.JSONE(core.CodeErr, "Cluster data acquisition failed: "+err.Error(), err)
		return
	}
	namespaces, err := client.KubeClient.List(api.ResourceNameNamespace, "", "")
	if err != nil {
		c.JSONE(core.CodeErr, "Cluster data acquisition failed: "+err.Error(), err)
		return
	}
	resp := make([]view2.RespNamespaceConfigmaps, 0)

	filter := make(map[string]interface{})

	conds := egorm.Conds{}
	conds["cluster_id"] = clusterId
	dbConfigmaps, _ := db2.K8SConfigMapListX(conds)
	nscm := make(map[string][]view2.RespConfigmap)
	for _, cm := range dbConfigmaps {
		if _, ok := nscm[cm.Namespace]; !ok {
			nscm[cm.Namespace] = make([]view2.RespConfigmap, 0)
		}
		nscm[cm.Namespace] = append(nscm[cm.Namespace], view2.RespConfigmap{
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
				nscm[cm.Namespace] = make([]view2.RespConfigmap, 0)
			}
			nscm[cm.Namespace] = append(nscm[cm.Namespace], view2.RespConfigmap{
				Name: cm.Name,
			})
		}
	}

	for namespace, respConfigMap := range nscm {
		if len(respConfigMap) > 0 {
			resp = append(resp, view2.RespNamespaceConfigmaps{
				Namespace:  namespace,
				Configmaps: respConfigMap,
			})
		}
	}
	sort.Slice(resp,
		func(i, j int) bool { return len(resp[i].Configmaps) > len(resp[j].Configmaps) })
	c.JSONOK(resp)
}

// ConfigMapCreate Get configmap by name
// @Tags         KUBE
func ConfigMapCreate(c *core.Context) {
	clusterId := cast.ToInt(c.Param("clusterId"))
	if clusterId == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	param := view2.ReqCreateConfigMap{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	// Gets the configmap ID
	obj := db2.K8SConfigMap{
		ClusterId: clusterId,
		Name:      param.ConfigmapName,
		Namespace: param.Namespace,
	}
	resp, err := db2.K8SConfigMapLoadOrSave(invoker.Db, &obj)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.ClusterCMDB(c.User(), db2.OpnClustersConfigMapCreate, map[string]interface{}{"param": param})
	c.JSONOK(resp)
}

// ConfigMapInfo Get configmap by name
// @Tags         KUBE
func ConfigMapInfo(c *core.Context) {
	clusterId := cast.ToInt(c.Param("clusterId"))
	namespace := strings.TrimSpace(c.Param("namespace"))
	name := strings.TrimSpace(c.Param("name"))
	if clusterId == 0 || namespace == "" || name == "" {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	param := view2.ReqConfigMapInfo{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	var upstreamValue string
	upstreamValue, err = resource.GetConfigmap(clusterId, namespace, name, param.Key)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK(upstreamValue)
}
