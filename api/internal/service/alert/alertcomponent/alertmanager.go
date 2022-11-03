package alertcomponent

import (
	"sync"

	"github.com/pkg/errors"
)

var _ Component = (*AlertManager)(nil)

// AlertManager Object resource pool
var alertmanagerResourcePool sync.Map

type AlertManager struct {
	url string
}

func NewAlertManager(url string) (*AlertManager, error) {
	if v, ok := alertmanagerResourcePool.Load(url); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new alertmanagers")
		}
		if obj, typeOk := v.(*AlertManager); typeOk {
			return obj, nil
		}
		return nil, errors.Wrap(ErrNilObject, "v.(*AlertManager)")
	}
	p := &AlertManager{url: url}
	alertmanagerResourcePool.Store(url, p)
	return p, nil
}

// Health 无法检测从 alertmanger 到 clickvisual 的网络状态
func (p *AlertManager) Health() error {
	if err := sim2telnet(p.url); err != nil {
		return err
	}
	if err := p.CheckDependents(); err != nil {
		return err
	}
	return nil
}

// CheckDependents ...
func (p *AlertManager) CheckDependents() error {
	return nil
}
