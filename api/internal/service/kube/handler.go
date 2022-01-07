/*
	ResourceHandler responsible for doing common operations on kubernetes resources. like
UPDATE DELETE CREATE GET deployment(or other resources) and so on. 具体可以handle哪些k8s资源,请查看本包内的api/types.go文件, 后续可追加.
	It's using cache, can reduce the request stress of k8s apiServer.
*/
package kube

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/service/kube/api"
	"github.com/shimohq/mogo/api/internal/service/kube/patcher"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	// "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/restmapper"
	"k8s.io/kubectl/pkg/util"

	"go.uber.org/zap"
	cliReSrc "k8s.io/cli-runtime/pkg/resource"

	"k8s.io/apimachinery/pkg/api/errors"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	meta_v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

type Metadata struct {
	Name      string
	Namespace string
	Group     string
	Version   string
	Resource  string
	Kind      string
}

type ResourceHandler interface {
	Create(kind string, namespace string, object *runtime.Unknown) (*runtime.Unknown, error)
	Update(kind string, namespace string, name string, object *runtime.Unknown) (*runtime.Unknown, error)
	Get(kind string, namespace string, name string) (runtime.Object, error)
	List(kind string, namespace string, labelSelector string) ([]runtime.Object, error)
	Delete(kind string, namespace string, name string, options *meta_v1.DeleteOptions) error
	Apply(kind string, obj runtime.Object) error
}

type resourceHandler struct {
	client       *kubernetes.Clientset
	cacheFactory *CacheFactory
}

func NewResourceHandler(kubeClient *kubernetes.Clientset, cacheFactory *CacheFactory) ResourceHandler {
	return &resourceHandler{
		client:       kubeClient,
		cacheFactory: cacheFactory,
	}
}

func (h *resourceHandler) Create(kind string, namespace string, object *runtime.Unknown) (*runtime.Unknown, error) {
	resource, ok := api.KindToResourceMap[kind]
	if !ok {
		return nil, fmt.Errorf("Resource kind (%s) not support yet . ", kind)
	}
	kubeClient := h.getClientByGroupVersion(resource.GroupVersionResourceKind.GroupVersionResource)
	req := kubeClient.Post().
		Resource(kind).
		SetHeader("Content-Type", "application/json").
		Body([]byte(object.Raw))
	if resource.Namespaced {
		req.Namespace(namespace)
	}
	var result runtime.Unknown
	err := req.Do(context.Background()).Into(&result)

	return &result, err
}

func (h *resourceHandler) Update(kind string, namespace string, name string, object *runtime.Unknown) (*runtime.Unknown, error) {
	resource, ok := api.KindToResourceMap[kind]
	if !ok {
		return nil, fmt.Errorf("Resource kind (%s) not support yet . ", kind)
	}

	kubeClient := h.getClientByGroupVersion(resource.GroupVersionResourceKind.GroupVersionResource)
	req := kubeClient.Put().
		Resource(kind).
		Name(name).
		SetHeader("Content-Type", "application/json").
		Body([]byte(object.Raw))
	if resource.Namespaced {
		req.Namespace(namespace)
	}

	var result runtime.Unknown
	err := req.Do(context.Background()).Into(&result)

	return &result, err
}

func (h *resourceHandler) Delete(kind string, namespace string, name string, options *meta_v1.DeleteOptions) error {
	resource, ok := api.KindToResourceMap[kind]
	if !ok {
		return fmt.Errorf("Resource kind (%s) not support yet . ", kind)
	}
	kubeClient := h.getClientByGroupVersion(resource.GroupVersionResourceKind.GroupVersionResource)
	req := kubeClient.Delete().
		Resource(kind).
		Name(name).
		Body(options)
	if resource.Namespaced {
		req.Namespace(namespace)
	}

	return req.Do(context.Background()).Error()
}

// Get object from cache
func (h *resourceHandler) Get(kind string, namespace string, name string) (runtime.Object, error) {
	resource, ok := api.KindToResourceMap[kind]
	if !ok {
		return nil, fmt.Errorf("Resource kind (%s) not support yet . ", kind)
	}
	genericInformer, err := h.cacheFactory.sharedInformerFactory.ForResource(resource.GroupVersionResourceKind.GroupVersionResource)
	if err != nil {
		return nil, err
	}
	lister := genericInformer.Lister()
	var result runtime.Object
	if resource.Namespaced {
		result, err = lister.ByNamespace(namespace).Get(name)
		if err != nil {
			return nil, err
		}
	} else {
		result, err = lister.Get(name)
		if err != nil {
			return nil, err
		}
	}
	result.GetObjectKind().SetGroupVersionKind(schema.GroupVersionKind{
		Group:   resource.GroupVersionResourceKind.Group,
		Version: resource.GroupVersionResourceKind.Version,
		Kind:    resource.GroupVersionResourceKind.Kind,
	})

	return result, nil
}

// List object from cache
func (h *resourceHandler) List(kind string, namespace string, labelSelector string) ([]runtime.Object, error) {
	resource, ok := api.KindToResourceMap[kind]
	if !ok {
		return nil, fmt.Errorf("Resource kind (%s) not support yet . ", kind)
	}
	genericInformer, err := h.cacheFactory.sharedInformerFactory.ForResource(resource.GroupVersionResourceKind.GroupVersionResource)
	if err != nil {
		return nil, err
	}
	selectors, err := labels.Parse(labelSelector)
	if err != nil {
		elog.Error("Build label selector error.", zap.Error(err))
		return nil, err
	}

	lister := genericInformer.Lister()
	var objs []runtime.Object
	if resource.Namespaced {
		objs, err = lister.ByNamespace(namespace).List(selectors)
		if err != nil {
			return nil, err
		}
	} else {
		objs, err = lister.List(selectors)
		if err != nil {
			return nil, err
		}
	}

	for i := range objs {
		objs[i].GetObjectKind().SetGroupVersionKind(schema.GroupVersionKind{
			Group:   resource.GroupVersionResourceKind.Group,
			Version: resource.GroupVersionResourceKind.Version,
			Kind:    resource.GroupVersionResourceKind.Kind,
		})
	}

	return objs, nil
}
func (h *resourceHandler) Apply(kind string, obj runtime.Object) error {
	resource, ok := api.KindToResourceMap[kind]
	if !ok {
		return fmt.Errorf("Resource kind (%s) not support yet . ", kind)
	}
	restClient := h.getClientByGroupVersion(resource.GroupVersionResourceKind.GroupVersionResource)
	// Create a REST mapper that tracks information about the available resources in the cluster.
	groupResources, err := restmapper.GetAPIGroupResources(h.client.Discovery())
	if err != nil {
		return err
	}
	rm := restmapper.NewDiscoveryRESTMapper(groupResources)

	// Get metadata needed to make the REST request.
	gvk := obj.GetObjectKind().GroupVersionKind()
	gk := schema.GroupKind{Group: gvk.Group, Kind: gvk.Kind}
	mapping, err := rm.RESTMapping(gk, gvk.Version)
	if err != nil {
		return err
	}

	restHelper := cliReSrc.NewHelper(restClient, mapping)
	// _, err = restHelper.Replace(namespace, name, overwrite, obj)
	m, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return err
	}

	u := &unstructured.Unstructured{
		Object: m,
	}

	SetDefaultNamespaceIfScopedAndNoneSet(u, restHelper)
	info := &cliReSrc.Info{
		Client:          restClient,
		Mapping:         mapping,
		Namespace:       u.GetNamespace(),
		Name:            u.GetName(),
		Source:          "",
		Object:          u,
		ResourceVersion: mapping.Resource.Version,
	}

	patcherObj, err := patcher.New(info, restHelper)
	if err != nil {
		return err
	}

	// Get the modified configuration of the object. Embed the result
	// as an annotation in the modified configuration, so that it will appear
	// in the patch sent to the server.
	modified, err := util.GetModifiedConfiguration(info.Object, true, unstructured.UnstructuredJSONScheme)
	if err != nil {
		return err
	}

	if err := info.Get(); err != nil {
		if !errors.IsNotFound(err) {
			return err
		}

		// Create the resource if it doesn't exist
		// First, update the annotation used by kubectl apply
		if err := util.CreateApplyAnnotation(info.Object, unstructured.UnstructuredJSONScheme); err != nil {
			return err
		}

		// Then create the resource and skip the three-way merge
		obj, err := restHelper.Create(info.Namespace, true, info.Object)
		if err != nil {
			return err
		}
		_ = info.Refresh(obj, true)
	}

	_, patchedObject, err := patcherObj.Patch(info.Object, modified, info.Namespace, info.Name)
	if err != nil {
		return err
	}

	_ = info.Refresh(patchedObject, true)
	return nil

}

func ResourceNotFound(err error) bool {
	if status, ok := err.(*k8serrors.StatusError); ok {
		if status.ErrStatus.Code == http.StatusNotFound {
			return true
		}
	}
	return false
}
