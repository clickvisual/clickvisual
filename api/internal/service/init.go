package service

import (
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/service/configure"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/kube"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/user"
)

var (
	Permission      *permission.Service
	InstanceManager *instanceManager
	Index           *index
	Alarm           *alarm
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("app.permissionFile")})
	InstanceManager = NewInstanceManager()

	Index = NewIndex()
	Alarm = NewAlarm()

	initGob()
	configure.InitConfigure()
	kube.InitClusterManager()

	// event
	event.InitService()
	user.Init()
	permission.InitManager()
	return nil
}
