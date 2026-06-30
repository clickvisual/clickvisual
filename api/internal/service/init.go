package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube"
	"github.com/clickvisual/clickvisual/api/internal/pkg/preempt"
	"github.com/clickvisual/clickvisual/api/internal/service/configure"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/report"
	"github.com/clickvisual/clickvisual/api/internal/service/shorturl"
	"github.com/clickvisual/clickvisual/api/internal/service/user"
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

var (
	dbBackedMu      sync.Mutex
	dbBackedStarted bool
	attachLoopStop  chan struct{}

	tryAttachMetadataDB   = invoker.TryAttachMetadataDB
	startDBBackedServices = defaultStartDBBackedServices
	startDBBackedWorkers  func() error
)

func SetDBBackedWorkerStarter(fn func() error) {
	startDBBackedWorkers = fn
}

func Init() error {
	Permission = permission.New(&permission.Config{ResFilePath: econf.GetString("app.permissionFile")})
	InstanceManager = NewInstanceManager()

	Index = NewIndex()
	Alert = NewAlarm()

	initGob()
	configure.InitConfigure()
	user.Init()
	event.InitService()

	Dependence = NewDependence()
	Node = NewNode()
	Storage = NewSrvStorage()

	if invoker.Db == nil {
		elog.Warn("metadata database is not ready, skip db-backed service initializers until attach")
		if err := report.StartScheduler(); err != nil {
			return err
		}
		startMetadataDBAttachLoop()
		return nil
	}

	return attachMetadataDBOnce()
}

func defaultStartDBBackedServices() error {
	if invoker.Db == nil {
		return fmt.Errorf("metadata database is not attached")
	}

	kube.InitClusterManager()
	permission.InitManager()

	xgo.Go(func() {
		Dependence.Sync()
	})
	xgo.Go(func() {
		shorturl.Clean()
	})

	report.StopScheduler()
	if err := report.StartScheduler(); err != nil {
		return err
	}

	// Storage service start
	// Support for multiple copies mode
	if econf.GetBool("app.isMultiCopy") {
		sf := func() { Storage.tickerTraceWorker() }
		ef := func() { Storage.stop() }
		elog.Debug("crontabRules", elog.String("step", "isMultiCopy"))
		ppt = preempt.NewPreempt(context.Background(), invoker.Redis, "clickvisual:trace", sf, ef)
		if startDBBackedWorkers != nil {
			if err := startDBBackedWorkers(); err != nil {
				return err
			}
		}
		return nil
	}
	xgo.Go(func() { Storage.tickerTraceWorker() })
	// Storage service start end
	if startDBBackedWorkers != nil {
		if err := startDBBackedWorkers(); err != nil {
			return err
		}
	}
	return nil
}

func attachMetadataDBOnce() error {
	dbBackedMu.Lock()
	if dbBackedStarted {
		dbBackedMu.Unlock()
		return nil
	}
	dbBackedMu.Unlock()

	if err := tryAttachMetadataDB(); err != nil {
		return err
	}
	if invoker.Db == nil {
		return fmt.Errorf("metadata database is not attached")
	}

	dbBackedMu.Lock()
	defer dbBackedMu.Unlock()
	if dbBackedStarted {
		return nil
	}
	if err := startDBBackedServices(); err != nil {
		return err
	}
	dbBackedStarted = true
	return nil
}

func startMetadataDBAttachLoop() {
	dbBackedMu.Lock()
	if attachLoopStop != nil {
		dbBackedMu.Unlock()
		return
	}
	attachLoopStop = make(chan struct{})
	stop := attachLoopStop
	dbBackedMu.Unlock()

	xgo.Go(func() {
		interval := econf.GetDuration("mysql.attachRetryInterval")
		if interval <= 0 {
			interval = 5 * time.Second
		}
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := attachMetadataDBOnce(); err != nil {
					elog.Warn("metadata database attach not ready", elog.FieldErr(err))
					continue
				}
				elog.Info("metadata database attach complete")
				return
			case <-stop:
				return
			}
		}
	})
}

func stopMetadataDBAttachLoop() {
	dbBackedMu.Lock()
	defer dbBackedMu.Unlock()
	if attachLoopStop == nil {
		return
	}
	close(attachLoopStop)
	attachLoopStop = nil
}

func Close() error {
	stopMetadataDBAttachLoop()
	report.StopScheduler()
	// Storage service stop
	if Storage == nil {
		return nil
	}
	if econf.GetBool("app.isMultiCopy") {
		if ppt != nil {
			ppt.Close()
		}
	} else {
		Storage.stop()
	}
	// Storage service stop end
	dbBackedMu.Lock()
	dbBackedStarted = false
	dbBackedMu.Unlock()
	return nil
}
