package service

import (
	"time"

	"github.com/ego-component/egorm"
	"go.uber.org/multierr"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/storage"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
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
	ticker := time.NewTicker(time.Second * 10)
	defer ticker.Stop()
	for range ticker.C {
		core.LoggerError("iStorage", "tickerTraceWorker", s.syncTraceWorker())
	}
	return
}

func (s *iStorage) syncTraceWorker() error {
	// 获取链路表的数据
	conds := egorm.Conds{}
	conds["create_type"] = constx.TableCreateTypeUBW
	list, err := db.TableList(invoker.Db, conds)
	if err != nil {
		return err
	}
	for _, row := range list {
		if row.V3TableType == db.V3TableTypeJaegerJSON {
			errRow := s.on(row)
			if errRow != nil {
				err = multierr.Append(err, err)
			}
		} else {
			s.off(row)
		}
	}
	return err
}

func (s *iStorage) on(row *db.BaseTable) error {
	flag, ok := s.workersF[row.ID]
	if ok && flag {
		return nil
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
	op, err := InstanceManager.Load(row.Database.Iid)
	if err != nil {
		s.workersF[row.ID] = false
		return err
	}
	worker := storage.NewWorkerTrace(storage.WorkerParams{
		Spec:   "*/10 * * * *",
		Source: source,
		Target: target,
		DB:     op.Conn(),
	})
	s.workers[row.ID] = worker
	return nil
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
