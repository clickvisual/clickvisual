package storageworker

import (
	"fmt"
	"time"

	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/elog"
	"github.com/robfig/cron/v3"

	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

var _ iWorker = (*Trace)(nil)

// Trace Used to otel jaeger json data analysis
type Trace struct {
	// default
	worker

	// crontab job
	c *cron.Cron
}

func NewTrace(params WorkerParams) *Trace {
	w := &Trace{}
	w.SetParams(params)
	xgo.Go(func() { w.Start() })
	return w
}

func (w *Trace) Start() {
	c := cron.New()
	if _, err := c.AddFunc(w.spec, func() { w.run() }); err != nil {
		elog.Error("Trace", elog.FieldComponent("Start"), elog.FieldName("addFunc"), elog.FieldErr(err))
		return
	}
	c.Start()
	w.c = c
}

func (w *Trace) Stop() {
	if w.c != nil {
		w.c.Stop()
	}
	return
}

func (w *Trace) run() {
	elog.Info("workerTrace", elog.FieldComponent("run"), elog.FieldName("gogogo"))
	var dependencies []view.JaegerDependencyDataModel
	query := fmt.Sprintf(queryJaegerCallCountSql, time.Now().Format("2006-01-02 15:04:05"), w.source.String(), w.source.String())
	res, err := w.db.Query(query)
	if err != nil {
		elog.Error("workerTrace", elog.FieldComponent("run"), elog.FieldName("query"), elog.FieldErr(err))
		return
	}
	elog.Debug("workerTrace", elog.FieldComponent("sql"), elog.String("query", query))
	for res.Next() {
		var timestamp time.Time
		var parent string
		var child string
		var callCount int64
		var serverDurationP50 float64
		var serverDurationP90 float64
		var serverDurationP99 float64
		var clientDurationP50 float64
		var clientDurationP90 float64
		var clientDurationP99 float64
		var serverSuccessRate float64
		var clientSuccessRate float64
		var t time.Time
		if err = res.Scan(&timestamp, &parent, &child, &callCount, &serverDurationP50, &serverDurationP90, &serverDurationP99, &clientDurationP50, &clientDurationP90, &clientDurationP99, &serverSuccessRate, &clientSuccessRate, &t); err != nil {
			elog.Error("workerTrace", elog.FieldComponent("run"), elog.FieldName("scan"), elog.FieldErr(err))
			return
		}
		dependencies = append(dependencies, view.JaegerDependencyDataModel{
			Timestamp:         timestamp,
			Parent:            parent,
			Child:             child,
			CallCount:         callCount,
			ServerDurationP50: serverDurationP50,
			ServerDurationP90: serverDurationP90,
			ServerDurationP99: serverDurationP99,
			ClientDurationP50: clientDurationP50,
			ClientDurationP90: clientDurationP90,
			ClientDurationP99: clientDurationP99,
			ServerSuccessRate: serverSuccessRate,
			ClientSuccessRate: clientSuccessRate,
			Time:              t,
		})
	}
	reflectLen := len(dependencies)
	if reflectLen == 0 {
		elog.Warn("workerTrace", elog.FieldComponent("run"), elog.FieldName("dependencies"), elog.String("dependencies", "empty"))
		return
	}
	elog.Debug("workerTrace", elog.FieldComponent("data"), elog.Any("dependencies", dependencies))
	for i := 0; i < reflectLen; i += batchInsertSize {
		ends := i + batchInsertSize
		if ends > reflectLen {
			ends = reflectLen
		}
		err = w.batchInsert(dependencies[i:ends])
		if err != nil {
			elog.Error("Trace", elog.FieldComponent("run"), elog.FieldName("batchInsert"), elog.FieldErr(err))
			return
		}
	}
	return
}

func (w *Trace) batchInsert(req []view.JaegerDependencyDataModel) error {
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
			uint64(dependency.CallCount),
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
