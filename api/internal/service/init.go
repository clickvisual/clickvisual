package service

import (
	"github.com/gotomicro/cetus/pkg/xgo"
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
	Node            *node
	Storage         *iStorage
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("app.permissionFile")})
	InstanceManager = NewInstanceManager()

	Index = NewIndex()
	Alarm = NewAlarm()

	initGob()
	configure.InitConfigure()
	kube.InitClusterManager()

	event.InitService()
	user.Init()
	permission.InitManager()

	xgo.Go(func() {
		DoDepsSync()
	})
	xgo.Go(func() {
		ShortURLClean()
	})

	Node = NewNode()

	Storage = NewStorage()
	// xgo.Go(func() {})
	return nil
}
