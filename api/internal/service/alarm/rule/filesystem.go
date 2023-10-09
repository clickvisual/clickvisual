package rule

import (
	"os"
	"strings"
	"sync"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

var _ Component = (*fileSystem)(nil)

// FileSystem Object resource pool
var resourcePoolFileSystem sync.Map

type fileSystem struct {
	iid      int
	md5      string
	rulePath string
}

func NewFileSystem(params *Params) (*fileSystem, error) {
	nmd5 := params.md5()
	if v, ok := resourcePoolFileSystem.Load(params.InstanceID); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new")
		}
		obj, typeOk := v.(*fileSystem)
		if !typeOk {
			return nil, errors.Wrap(ErrNilObject, "type")
		}
		if obj.md5 == nmd5 {
			return obj, nil
		}
	}
	p := &fileSystem{iid: params.InstanceID, rulePath: params.RulePath, md5: nmd5}
	resourcePoolFileSystem.Store(params.InstanceID, p)
	return p, nil
}

func (r *fileSystem) CreateOrUpdate(groupName, ruleName, content string) error {
	if r.rulePath == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	path := strings.TrimSuffix(r.rulePath, "/")
	if err := os.WriteFile(path+"/"+ruleName, []byte(content), 0644); err != nil {
		return errors.Wrapf(err, "rule name %s, rule %s", ruleName, content)
	}
	return nil
}

func (r *fileSystem) Delete(groupName, ruleName string) error {
	if r.rulePath == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	path := strings.TrimSuffix(r.rulePath, "/")
	if err := os.Remove(path + "/" + ruleName); err != nil && !errors.Is(err, os.ErrNotExist) {
		return errors.Wrapf(err, "file path is %s", r.rulePath)
	}
	return nil
}

func (r *fileSystem) BatchSet(groupName string, rules []db.ClusterRuleItem) error {
	return ErrNotYetSupported
}

func (r *fileSystem) BatchRemove(groupName string) error {
	return ErrNotYetSupported
}
