package service

import (
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/storage"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type iStorage struct {
	workersF map[int]bool
	workers  map[int]*storage.WorkerTrace
}

func NewStorage() *iStorage {
	return &iStorage{
		workersF: make(map[int]bool, 0),
		workers:  make(map[int]*storage.WorkerTrace, 0),
	}
}

func (s *iStorage) tickerTraceWorker() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		elog.Info("workerTrace", elog.FieldComponent("tickerTraceWorker"), elog.FieldName("tickStart"), elog.Any("workersF", s.workersF))
		s.syncTraceWorker()
	}
	return
}

func (s *iStorage) syncTraceWorker() {
	// 获取链路表的数据
	conds := egorm.Conds{}
	conds["create_type"] = constx.TableCreateTypeUBW
	list, err := db.TableList(invoker.Db, conds)
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("syncTraceWorker"), elog.FieldName("tableList"), elog.FieldErr(err))
		return
	}
	for _, row := range list {
		if row.V3TableType == db.V3TableTypeJaegerJSON {
			elog.Info("workerTrace", elog.FieldComponent("tickerTraceWorker"), elog.FieldName("on"),
				elog.String("table", row.Name), elog.Any("tid", row.ID))
			s.on(row)
		} else {
			elog.Debug("workerTrace", elog.FieldComponent("tickerTraceWorker"), elog.FieldName("off"),
				elog.String("table", row.Name), elog.Any("tid", row.ID))
			s.off(row)
		}
	}
}

func (s *iStorage) on(row *db.BaseTable) {
	flag, ok := s.workersF[row.ID]
	if ok && flag {
		return
	}
	s.workersF[row.ID] = true
	// source table
	source := storage.Datasource{}
	source.SetDatabase(row.Database.Name)
	source.SetTable(row.Name)
	// target table
	target := storage.Datasource{}
	target.SetDatabase(row.Database.Name)
	target.SetTable(row.Name + db.SuffixJaegerJSON)
	// params
	op, errInstanceManager := InstanceManager.Load(row.Database.Iid)
	if errInstanceManager != nil {
		s.workersF[row.ID] = false
		elog.Error("workerTrace", elog.FieldComponent("syncTraceWorker"), elog.FieldName("errInstanceManager"), elog.FieldErr(errInstanceManager))
		return
	}
	worker := storage.NewWorkerTrace(storage.WorkerParams{
		Spec:   "0 * * * *", // only support hour
		Source: source,
		Target: target,
		DB:     op.Conn(),
	})
	s.workers[row.ID] = worker
}

func (s *iStorage) off(row *db.BaseTable) {
	flag, ok := s.workersF[row.ID]
	if !ok || !flag {
		return
	}
	w := s.workers[row.ID]
	if w != nil {
		w.Stop()
	}
	return
}

func (s *iStorage) Stop() {
	for _, w := range s.workers {
		if w != nil {
			w.Stop()
		}
	}
	return
}
