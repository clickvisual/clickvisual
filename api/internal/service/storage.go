package service

import (
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/storage"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type iStorage struct {
	worker map[int]bool
}

func NewStorage() *iStorage {
	return &iStorage{
		worker: make(map[int]bool, 0),
	}
}

func (s *iStorage) tickerTraceWorker() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		elog.Info("workerTrace", elog.FieldComponent("tickerTraceWorker"), elog.FieldName("tickStart"))
		s.syncTraceWorker()
	}
	return
}

func (s *iStorage) syncTraceWorker() {
	// 获取链路表的数据
	conds := egorm.Conds{}
	conds["v3_table_type"] = db.V3TableTypeJaegerJSON
	list, err := db.TableList(invoker.Db, conds)
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("syncTraceWorker"), elog.FieldName("tableList"), elog.FieldErr(err))
		return
	}
	elog.Debug("workerTrace", elog.FieldComponent("tickerTraceWorker"), elog.FieldName("tableList"), elog.Any("list", list))
	for _, row := range list {
		flag, ok := s.worker[row.ID]
		if ok && flag {
			continue
		}
		s.worker[row.ID] = true
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
			s.worker[row.ID] = false
			elog.Error("workerTrace", elog.FieldComponent("syncTraceWorker"), elog.FieldName("errInstanceManager"), elog.FieldErr(errInstanceManager))
			return
		}
		_ = storage.NewWorkerTrace(storage.WorkerParams{
			Spec:   "0 * * * *", // only support hour
			Source: source,
			Target: target,
			DB:     op.Conn(),
		})
	}
}
