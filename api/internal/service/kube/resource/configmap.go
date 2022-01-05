package resource

import (
	"encoding/json"
	"fmt"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/api"

	corev1 "k8s.io/api/core/v1"
	kapi "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func ConfigmapCreateOrUpdate(client *kube.ClusterClient, namespace, name string, data map[string]string) error {
	obj, err := client.KubeClient.Get(api.ResourceNameConfigMap, name, "")
	configMap := obj.(*corev1.ConfigMap)
	if NotFound(err) {
		if err = configmapCreate(client, namespace, name, data); err != nil {
			elog.Error("ConfigmapCreateOrUpdate", elog.String("namespace", namespace), elog.String("name", name), elog.Any("data", data), elog.String("err", err.Error()))
			return err
		}
		return nil
	}
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

func ConfigmapDelete(clusterId int, namespace, name string, keys ...string) error {
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("集群数据获取失败: %s, 集群 ID: %d", err.Error(), clusterId))
	}
	obj, err := client.KubeClient.Get(api.ResourceNameConfigMap, name, "")
	if err != nil {
		if NotFound(err) {
			return nil
		}
		return errors.Wrap(err, "Get ConfigMap failed, in cluster")
	}
	configMap := obj.(*corev1.ConfigMap)
	for _, k := range keys {
		delete(configMap.Data, k)
	}
	return configmapUpdate(client, namespace, name, configMap)
}
