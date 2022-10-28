package service

import (
	"context"

	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/configure"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/kube"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/user"
	"github.com/clickvisual/clickvisual/api/pkg/preempt"
)

var (
	Permission      *permission.Service
	InstanceManager *instanceManager
	Index           *index
	Alarm           *alarm
	Node            *node
	Storage         *iStorage
	ppt             *preempt.Preempt
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("app.permissionFile")})
	InstanceManager = NewInstanceManager()

	Index = NewIndex()
	Alarm = NewAlarm()

	initGob()
	configure.InitConfigure()
	kube.InitClusterManager()

	user.Init()
	event.InitService()
	permission.InitManager()

	Dependence = NewDependence()
	xgo.Go(func() {
		Dependence.Sync()
	})
	xgo.Go(func() {
		ShortURLClean()
	})

	Node = NewNode()

	// Storage service start
	Storage = NewStorage()
	// Support for multiple copies mode
	if econf.GetBool("app.isMultiCopy") {
		sf := func() { Storage.tickerTraceWorker() }
		ef := func() { Storage.Stop() }
		invoker.Logger.Debug("crontabRules", elog.String("step", "isMultiCopy"))
		ppt = preempt.NewPreempt(context.Background(), invoker.Redis, "clickvisual:trace", sf, ef)
		return nil
	}
	xgo.Go(func() { Storage.tickerTraceWorker() })
	// Storage service start end
	return nil
}

func Close() error {
	// Storage service stop
	if econf.GetBool("app.isMultiCopy") {
		ppt.Close()
	} else {
		Storage.Stop()
	}
	// Storage service stop end
	return nil
}
