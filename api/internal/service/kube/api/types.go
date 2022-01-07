package api

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	extensionsv1beta1 "k8s.io/api/extensions/v1beta1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type ResourceName = string
type KindName = string

const (
	ResourceNameConfigMap  ResourceName = "configmaps"
	ResourceNameDeployment ResourceName = "deployments"
	ResourceNameIngress    ResourceName = "ingresses"
	ResourceNameNamespace  ResourceName = "namespaces"
	ResourceNameNode       ResourceName = "nodes"
	ResourceNamePod        ResourceName = "pods"
	ResourceNameReplicaSet ResourceName = "replicasets"
	ResourceNameService    ResourceName = "services"
	ResourceNameEndpoint   ResourceName = "endpoints"

	ResourceNameEvent ResourceName = "events"
)

const (
	KindNameConfigMap  KindName = "ConfigMap"
	KindNameDeployment KindName = "Deployment"
	KindNameIngress    KindName = "Ingress"
	KindNameNamespace  KindName = "Namespace"
	KindNameNode       KindName = "Node"
	KindNamePod        KindName = "Pod"
	KindNameReplicaSet KindName = "ReplicaSet"
	KindNameService    KindName = "Service"
	KindNameEndpoint   KindName = "Endpoints"

	KindNameEvent KindName = "Event"
)

type ResourceMap struct {
	GroupVersionResourceKind GroupVersionResourceKind
	Namespaced               bool
}

type GroupVersionResourceKind struct {
	schema.GroupVersionResource
	Kind string
}

// 这里做k8s资源的映射, 应对后续k8s版本更新时的Version,Group等变动
var KindToResourceMap = map[string]ResourceMap{
	ResourceNameEvent: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNameEvent,
			},
			Kind: KindNameEvent,
		},
		Namespaced: true,
	},
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
	ResourceNameDeployment: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    appsv1.GroupName,
				Version:  appsv1.SchemeGroupVersion.Version,
				Resource: ResourceNameDeployment,
			},
			Kind: KindNameDeployment,
		},
		Namespaced: true,
	},
	ResourceNameIngress: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    extensionsv1beta1.GroupName,
				Version:  extensionsv1beta1.SchemeGroupVersion.Version,
				Resource: ResourceNameIngress,
			},
			Kind: KindNameIngress,
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
	ResourceNameNode: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNameNode,
			},
			Kind: KindNameNode,
		},
		Namespaced: false,
	},
	ResourceNamePod: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNamePod,
			},
			Kind: KindNamePod,
		},
		Namespaced: true,
	},
	ResourceNameReplicaSet: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				//Group:    extensionsv1beta1.GroupName,
				Group: appsv1.GroupName,
				//Version:  extensionsv1beta1.SchemeGroupVersion.Version,
				Version:  appsv1.SchemeGroupVersion.Version,
				Resource: ResourceNameReplicaSet,
			},
			Kind: KindNameReplicaSet,
		},
		Namespaced: true,
	},
	ResourceNameService: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNameService,
			},
			Kind: KindNameService,
		},
		Namespaced: true,
	},
	ResourceNameEndpoint: {
		GroupVersionResourceKind: GroupVersionResourceKind{
			GroupVersionResource: schema.GroupVersionResource{
				Group:    corev1.GroupName,
				Version:  corev1.SchemeGroupVersion.Version,
				Resource: ResourceNameEndpoint,
			},
			Kind: KindNameEndpoint,
		},
		Namespaced: true,
	},
}
