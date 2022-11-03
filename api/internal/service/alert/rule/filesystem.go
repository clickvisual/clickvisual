package rule

import (
	"os"
	"strings"
	"sync"

	"github.com/pkg/errors"
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

func (r *fileSystem) CreateOrUpdate(name, content string) error {
	if r.rulePath == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	path := strings.TrimSuffix(r.rulePath, "/")
	if err := os.WriteFile(path+"/"+name, []byte(content), 0644); err != nil {
		return errors.Wrapf(err, "rule name %s, rule %s", name, content)
	}
	return nil
}

func (r *fileSystem) Delete(name string) error {
	if r.rulePath == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	path := strings.TrimSuffix(r.rulePath, "/")
	if err := os.Remove(path + "/" + name); err != nil && !errors.Is(err, os.ErrNotExist) {
		return errors.Wrapf(err, "file path is %s", r.rulePath)
	}
	return nil
}
