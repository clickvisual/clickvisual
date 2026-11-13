package storageworker

import (
	"context"
	"database/sql/driver"
	"errors"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/testutil"
	"testing"
	"time"
)

func TestTraceRowsCloseOnScanFailure(t *testing.T) {
	rows := &testutil.Rows{Names: []string{"wrong"}, Values: [][]driver.Value{{"x"}}}
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) { return rows, nil }}
	conn := d.Open()
	defer conn.Close()
	w := &Trace{worker: worker{db: conn}}
	w.run()
	if !rows.Closed.Load() || conn.Stats().InUse != 0 {
		t.Fatalf("trace rows leaked: %+v", conn.Stats())
	}
}
func TestTraceRollbackOnPrepareFailure(t *testing.T) {
	d := &testutil.SQLDriver{PrepareErr: errors.New("prepare failed")}
	conn := d.Open()
	defer conn.Close()
	w := &Trace{worker: worker{db: conn}}
	if err := w.batchInsert([]view.JaegerDependencyDataModel{{}}); err == nil {
		t.Fatal("expected failure")
	}
	if d.Rollbacks.Load() != 1 || conn.Stats().InUse != 0 {
		t.Fatalf("transaction leaked: %+v", conn.Stats())
	}
}

func TestTraceRollbackAndStatementCloseOnExecFailure(t *testing.T) {
	d := &testutil.SQLDriver{ExecErr: errors.New("exec failed")}
	conn := d.Open()
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	w := &Trace{worker: worker{db: conn}}
	if err := w.batchInsert([]view.JaegerDependencyDataModel{{}}); err == nil {
		t.Fatal("expected failure")
	}
	if d.Rollbacks.Load() != 1 || d.StatementCloses.Load() != 1 || conn.Stats().InUse != 0 {
		t.Fatalf("transaction leaked: %+v", conn.Stats())
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	held, err := conn.Conn(ctx)
	if err != nil {
		t.Fatal(err)
	}
	held.Close()
}
func TestTraceTransactionCancellationReleasesConnection(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d := &testutil.SQLDriver{Exec: func(ctx context.Context) error { cancel(); <-ctx.Done(); return ctx.Err() }}
	conn := d.Open()
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	w := &Trace{worker: worker{db: conn}}
	err := w.batchInsertContext(ctx, []view.JaegerDependencyDataModel{{}})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("cancel lost: %v", err)
	}
	nextCtx, nextCancel := context.WithTimeout(context.Background(), time.Second)
	defer nextCancel()
	next, err := conn.Conn(nextCtx)
	if err != nil {
		t.Fatal(err)
	}
	next.Close()
	if d.Rollbacks.Load() != 1 || d.StatementCloses.Load() != 1 {
		t.Fatalf("resources not closed: rollback %d stmt %d", d.Rollbacks.Load(), d.StatementCloses.Load())
	}
}
func TestTraceIterationErrorDoesNotInsert(t *testing.T) {
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) {
		return &testutil.Rows{Names: []string{"timestamp"}, Err: errors.New("stream broken")}, nil
	}}
	conn := d.Open()
	defer conn.Close()
	w := &Trace{worker: worker{db: conn}}
	w.run()
	if conn.Stats().InUse != 0 {
		t.Fatal("connection leaked")
	}
}
