package service

import (
	"github.com/gotomicro/ego/core/econf"

	"github.com/shimohq/mogo/api/internal/service/configure"
	"github.com/shimohq/mogo/api/internal/service/event"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/permission"
)

var (
	Permission      *permission.Service
	InstanceManager *instanceManager
	User            *user
	Index           *index
	Alarm           *alarm
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("app.permissionFile")})
	InstanceManager = NewInstanceManager()

	User = NewUser()
	Index = NewIndex()
	Alarm = NewAlarm()

	initGob()
	configure.InitConfigure()
	kube.InitClusterManager()

	// event
	event.InitService()
	return nil
}
