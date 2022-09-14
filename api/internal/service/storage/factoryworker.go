package storage

import (
	"database/sql"
)

type iWorker interface {
	SetParams(WorkerParams)
	Start()
	Stop()
}

type WorkerParams struct {
	Spec string

	// for trace worker
	Source Datasource // source database.table
	Target Datasource // target database.table

	DB *sql.DB // clickhouse instance
}

var _ iWorker = (*worker)(nil)

// worker Used to otel jaeger json data analysis
type worker struct {
	spec string
	db   *sql.DB // clickhouse instance

	// for trace worker
	source Datasource // source database.table
	target Datasource // target database.table
}

func (w *worker) SetParams(params WorkerParams) {
	w.spec = params.Spec
	w.db = params.DB

	// for trace worker
	w.source = params.Source
	w.target = params.Target
	return
}

func (w *worker) Start() {
	return
}

func (w *worker) Stop() {
	return
}
