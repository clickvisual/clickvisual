package service

import (
	"github.com/gotomicro/ego/core/econf"

	"github.com/shimohq/mogo/api/internal/service/permission"
)

var (
	Permission      *permission.Service
	InstanceManager *instanceManager
	User            *user
	// Config          *config
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("permission.resourceFile")})
	InstanceManager = NewInstanceManager()
	initGob()
	User = NewUser()
	// Config = NewConfig()
	return nil
}
