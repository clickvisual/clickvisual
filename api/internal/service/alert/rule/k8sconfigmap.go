package rule

import (
	"sync"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/service/kube"
	"github.com/clickvisual/clickvisual/api/internal/service/kube/resource"
)

var _ Component = (*k8sConfigMap)(nil)

// k8sConfigMap Object resource pool
var resourcePoolK8sConfigMap sync.Map

type k8sConfigMap struct {
	md5       string
	iid       int
	clusterId int
	namespace string
	configmap string
}

func NewK8sConfigMap(params *Params) (*k8sConfigMap, error) {
	nmd5 := params.md5()
	if v, ok := resourcePoolK8sConfigMap.Load(params.InstanceID); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new")
		}
		obj, typeOk := v.(*k8sConfigMap)
		if !typeOk {
			return nil, errors.Wrap(ErrNilObject, "type")
		}
		if obj.md5 == nmd5 {
			return obj, nil
		}
	}
	p := &k8sConfigMap{
		iid:       params.InstanceID,
		md5:       nmd5,
		clusterId: params.ClusterId,
		namespace: params.Namespace,
		configmap: params.Configmap,
	}
	resourcePoolK8sConfigMap.Store(params.InstanceID, p)
	return p, nil
}

func (r *k8sConfigMap) UpdateParameters(params Params) Component {
	r.clusterId = params.ClusterId
	r.namespace = params.Namespace
	r.configmap = params.Configmap
	return r
}

func (r *k8sConfigMap) CreateOrUpdate(name, content string) error {
	if r.clusterId == 0 || r.namespace == "" || r.configmap == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	client, err := kube.ClusterManager.GetClusterManager(r.clusterId)
	if err != nil {
		return err
	}
	rules := make(map[string]string)
	rules[name] = content
	err = resource.ConfigmapCreateOrUpdate(client, r.namespace, r.configmap, rules)
	if err != nil {
		return err
	}
	return nil
}

func (r *k8sConfigMap) Delete(name string) error {
	if r.clusterId == 0 || r.namespace == "" || r.configmap == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	if err := resource.ConfigmapDelete(r.clusterId, r.namespace, r.configmap, name); err != nil {
		return err
	}
	return nil
}
