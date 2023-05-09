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
	"github.com/clickvisual/clickvisual/api/internal/service/shorturl"
	"github.com/clickvisual/clickvisual/api/internal/service/user"
	"github.com/clickvisual/clickvisual/api/pkg/preempt"
)

var (
	Permission      *permission.Service
	InstanceManager *instanceManager
	Index           *index
	Alert           *alert
	Node            *node
	Storage         *srvStorage
	ppt             *preempt.Preempt
)

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("app.permissionFile")})
	InstanceManager = NewInstanceManager()

	Index = NewIndex()
	Alert = NewAlarm()

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
		shorturl.Clean()
	})

	Node = NewNode()

	// Storage service start
	Storage = NewSrvStorage()
	// Support for multiple copies mode
	if econf.GetBool("app.isMultiCopy") {
		sf := func() { Storage.tickerTraceWorker() }
		ef := func() { Storage.stop() }
		elog.Debug("crontabRules", elog.String("step", "isMultiCopy"))
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
		Storage.stop()
	}
	// Storage service stop end
	return nil
}
