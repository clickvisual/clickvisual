package storage

import (
	"fmt"
	"time"

	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/elog"
)

var _ iWorker = (*workerTrace)(nil)

// workerTrace Used to otel jaeger json data analysis
type workerTrace struct {
	worker
}

type jaegerDependencyDataModel struct {
	Timestamp         time.Time
	Parent            string
	Child             string
	CallCount         int64
	ServerDurationP50 float64
	ServerDurationP90 float64
	ServerDurationP99 float64
	ClientDurationP50 float64
	ClientDurationP90 float64
	ClientDurationP99 float64
	ServerSuccessRate float64
	ClientSuccessRate float64
	Time              time.Time
}

func NewWorkerTrace(params WorkerParams) *workerTrace {
	w := &workerTrace{}
	w.SetParams(params)
	xgo.Go(func() { w.Start() })
	return w
}

func (w *workerTrace) Start() {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for range ticker.C {
		w.run()
	}
}
func (w *workerTrace) Stop() {
	return
}

func (w *workerTrace) run() {
	var dependencies []jaegerDependencyDataModel
	query := fmt.Sprintf(queryJaegerCallCountSql, time.Now().Format("2006-01-02 15:04:05"), w.source.String(), w.source.String())
	res, err := w.db.Query(query)
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("Start"), elog.FieldName("query"), elog.FieldErr(err))
		return
	}
	if err = res.Scan(&dependencies); err != nil {
		return
	}
	reflectLen := len(dependencies)
	if reflectLen == 0 {
		elog.Warn("workerTrace", elog.FieldComponent("Start"), elog.FieldName("dependencies"), elog.String("dependencies", "empty"))
		return
	}
	for i := 0; i < reflectLen; i += batchInsertSize {
		ends := i + batchInsertSize
		if ends > reflectLen {
			ends = reflectLen
		}
		err = w.batchInsert(dependencies[i:ends])
		if err != nil {
			elog.Error("workerTrace", elog.FieldComponent("Start"), elog.FieldName("batchInsert"), elog.FieldErr(err))
			return
		}
	}
	return
}

func (w *workerTrace) batchInsert(req []jaegerDependencyDataModel) error {
	scope, err := w.db.Begin()
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("batchInsert"), elog.FieldName("begin"), elog.FieldErr(err))
		return err
	}
	batch, err := scope.Prepare("INSERT INTO " + w.target.String())
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("batchInsert"), elog.FieldName("prepare"), elog.FieldErr(err))
		return err
	}
	for _, dependency := range req {
		_, err = batch.Exec(
			dependency.Timestamp,
			dependency.Parent,
			dependency.Child,
			dependency.CallCount,
			dependency.ServerDurationP50,
			dependency.ServerDurationP90,
			dependency.ServerDurationP99,
			dependency.ClientDurationP50,
			dependency.ClientDurationP90,
			dependency.ClientDurationP99,
			dependency.ServerSuccessRate,
			dependency.ClientSuccessRate,
			dependency.Time,
		)
		if err != nil {
			elog.Error("workerTrace", elog.FieldComponent("batchInsert"), elog.FieldName("batchExec"), elog.FieldErr(err))
			return err
		}
	}
	return scope.Commit()
}
