package permission

import (
	"io/ioutil"

	"github.com/gotomicro/ego/core/elog"
	"github.com/shimohq/mogo/api/internal/invoker"
	"gopkg.in/yaml.v3"
)

type Service struct {
	c        *Config
	resource Resource
}

type Config struct {
	ResFilePath string
}

func New(c *Config) *Service {
	return &Service{
		c:        c,
		resource: loadMenuTree(c.ResFilePath),
	}
}

func loadMenuTree(filePath string) Resource {
	menu := Resource{}

	resourceContent, err := ioutil.ReadFile(filePath)
	if err != nil {
		invoker.Logger.Panic("Read Resource File Failed", elog.String("err", err.Error()))
	}

	err = yaml.Unmarshal(resourceContent, &menu)
	if err != nil {
		invoker.Logger.Panic("Unmarshall %s failed: %s", elog.String("filePath", filePath), elog.String("err", err.Error()))
	}

	return menu
}

func (s *Service) MenuList() []MenuTreeItem {
	return s.resource.Permission
}
