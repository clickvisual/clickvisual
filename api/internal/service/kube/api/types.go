package api

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type ResourceName = string
type KindName = string

const (
	ResourceNameConfigMap ResourceName = "configmaps"
	ResourceNameNamespace ResourceName = "namespaces"
)

const (
	KindNameConfigMap      KindName     = "ConfigMap"
	KindNameNamespace      KindName     = "Namespace"
	KindNamePrometheusRule ResourceName = "PrometheusRule"
)

type ResourceMap struct {
	GroupVersionResourceKind GroupVersionResourceKind
	Namespaced               bool
}

type GroupVersionResourceKind struct {
	schema.GroupVersionResource
	Kind string
}

// KindToResourceMap 这里做k8s资源的映射, 应对后续k8s版本更新时的Version,Group等变动
var KindToResourceMap = map[string]ResourceMap{
	ResourceNameConfigMap: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNameConfigMap,
			},
			Kind: KindNameConfigMap,
		},
		Namespaced: true,
	},
	ResourceNameNamespace: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNameNamespace,
			},
			Kind: KindNameNamespace,
		},
		Namespaced: false,
	},
}
