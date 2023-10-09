package kube

import (
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/cli-runtime/pkg/resource"
)

func SetDefaultNamespaceIfScopedAndNoneSet(u *unstructured.Unstructured, helper *resource.Helper) {
	namespace := u.GetNamespace()
	if helper.NamespaceScoped && namespace == "" {
		namespace = "default"
		u.SetNamespace(namespace)
	}
}

func SetNamespaceIfScoped(namespace string, u *unstructured.Unstructured, helper *resource.Helper) {
	if helper.NamespaceScoped {
		u.SetNamespace(namespace)
	}
}
