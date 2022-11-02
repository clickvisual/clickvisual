package rule

import (
	"sync"

	"github.com/pkg/errors"
)

var _ Component = (*k8sOperator)(nil)

// k8sOperator Object resource pool
var resourcePoolK8sOperator sync.Map

type k8sOperator struct {
	md5 string
}

func NewK8sOperator(params *Params) (*k8sOperator, error) {
	nmd5 := params.md5()
	if v, ok := resourcePoolK8sOperator.Load(params.InstanceID); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new")
		}
		obj, typeOk := v.(*k8sOperator)
		if !typeOk {
			return nil, errors.Wrap(ErrNilObject, "type")
		}
		if obj.md5 == nmd5 {
			return obj, nil
		}
	}
	p := &k8sOperator{md5: nmd5}
	resourcePoolK8sOperator.Store(params.InstanceID, p)
	return p, nil
}

func (r *k8sOperator) UpdateParameters(params Params) Component {
	return r
}

func (r *k8sOperator) CreateOrUpdate(name, content string) error {
	return ErrNotYetSupported
}

func (r *k8sOperator) Delete(name string) error {
	return ErrNotYetSupported
}
