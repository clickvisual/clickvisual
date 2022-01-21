package resource

import (
	"encoding/json"
	"fmt"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	kapi "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/api"
)

func ConfigmapCreateOrUpdate(client *kube.ClusterClient, namespace, name string, data map[string]string) error {
	obj, err := client.KubeClient.Get(api.ResourceNameConfigMap, namespace, name)
	if NotFound(err) {
		if err = configmapCreate(client, namespace, name, data); err != nil {
			elog.Error("ConfigmapCreateOrUpdate", elog.String("namespace", namespace), elog.String("name", name), elog.Any("data", data), elog.String("err", err.Error()))
			return err
		}
		return nil
	}
	configMap := obj.(*corev1.ConfigMap)
	// target configMap exist, so update the data of configMap in current cluster:
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}
	for k, v := range data {
		configMap.Data[k] = v
	}
	if err = configmapUpdate(client, namespace, name, configMap); err != nil {
		return err
	}
	return nil
}

func ConfigmapDelete(clusterId int, namespace, name string, keys ...string) error {
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("cluster data acquisition failed: %s, cluster id: %d", err.Error(), clusterId))
	}
	obj, err := client.KubeClient.Get(api.ResourceNameConfigMap, namespace, name)
	elog.Debug("ConfigmapDelete", elog.String("step", "Get"))
	if err != nil {
		if NotFound(err) {
			elog.Debug("ConfigmapDelete", elog.String("step", "NotFound"))
			return nil
		}
		return errors.Wrap(err, "Get ConfigMap failed, in cluster")
	}
	configMap := obj.(*corev1.ConfigMap)
	elog.Debug("ConfigmapDelete", elog.String("step", "configMap"))
	for _, k := range keys {
		delete(configMap.Data, k)
	}
	elog.Debug("ConfigmapDelete", elog.String("step", "delete"), elog.Any("configMap", configMap))
	return configmapUpdate(client, namespace, name, configMap)
}

func ConfigmapInfo(clusterId int, namespace, name string, key string) (data string, err error) {
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		err = errors.Wrap(err, "cluster data acquisition failed")
		return
	}
	elog.Debug("ConfigMapInfo", elog.Int("clusterId", clusterId), elog.String("namespace", namespace), elog.String("name", name))
	obj, err := client.KubeClient.Get(api.ResourceNameConfigMap, namespace, name)
	if err != nil {
		if err.Error() == apierrors.NewNotFound(corev1.Resource("configmaps"), name).Error() {
			return "", nil
		}
		err = errors.Wrap(err, "configmap data read failed")
		return
	}
	cm := obj.(*corev1.ConfigMap)
	for k, v := range cm.Data {
		if k == key {
			data = v
			break
		}
	}
	return
}

func configmapCreate(client *kube.ClusterClient, namespace, name string, data map[string]string) error {
	acm := kapi.ConfigMap{
		TypeMeta: metaV1.TypeMeta{},
		ObjectMeta: metaV1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Data: data,
	}
	acmBytes, _ := json.Marshal(acm)
	_, err := client.KubeClient.Create(api.ResourceNameConfigMap, namespace, &runtime.Unknown{
		Raw: acmBytes,
	})
	if err != nil {
		return err
	}
	return nil
}

func configmapUpdate(client *kube.ClusterClient, namespace, name string, configMap *kapi.ConfigMap) error {
	acmBytes, _ := json.Marshal(configMap)
	_, err := client.KubeClient.Update(api.ResourceNameConfigMap, namespace, name, &runtime.Unknown{
		Raw: acmBytes,
	})
	if err != nil {
		return err
	}
	return nil
}
