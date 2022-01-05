package service

import (
	"github.com/gotomicro/ego/core/econf"

	"github.com/shimohq/mogo/api/internal/service/configure"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/permission"
)

var (
	Permission      *permission.Service
	InstanceManager *instanceManager
	User            *user
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("permission.resourceFile")})
	InstanceManager = NewInstanceManager()
	initGob()
	User = NewUser()
	configure.InitConfigure()
	kube.InitClusterManager()
	return nil
}
