// Package queryguard bounds query work and reports where slow requests wait.
package queryguard

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
)

// Timeout remains safe when an older deployment config omits the new key.
// Configure app.queryTimeout and app.querySlowThreshold as durations, e.g. "30s".
func Timeout() time.Duration {
	if d := econf.GetDuration("app.queryTimeout"); d > 0 {
		return d
	}
	return 30 * time.Second
}
func SlowThreshold() time.Duration {
	if d := econf.GetDuration("app.querySlowThreshold"); d > 0 {
		return d
	}
	return 2 * time.Second
}
func WithTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithTimeout(ctx, Timeout())
}

// Error keeps cancellation identifiable even when a driver returns its own error.
func Error(ctx context.Context, err error) error {
	if ctx.Err() != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return fmt.Errorf("query timed out: %w", ctx.Err())
		}
		return fmt.Errorf("query canceled: %w", ctx.Err())
	}
	// A socket deadline can fire just before the context timer is scheduled.
	if deadline, ok := ctx.Deadline(); ok && !time.Now().Before(deadline) {
		return fmt.Errorf("query timed out: %w", context.DeadlineExceeded)
	}
	return err
}

// Monitor reports both in-flight stalls and completed slow/failed operations.
// A request can update its stage and pool without racing the timer callback.
type monitorKey struct{}

var monitorSequence atomic.Uint64

// WithMonitor shares stage and pool diagnostics throughout a single request.
func WithMonitor(ctx context.Context, m *Monitor) context.Context {
	return context.WithValue(ctx, monitorKey{}, m)
}
func FromContext(ctx context.Context) *Monitor { m, _ := ctx.Value(monitorKey{}).(*Monitor); return m }

// Observe reuses a request monitor, or owns a standalone SQL operation monitor.
func Observe(ctx context.Context, operation string, instanceID int, pool *sql.DB) func(error) {
	if m := FromContext(ctx); m != nil {
		m.Instance(instanceID)
		m.Stage(operation, pool)
		return func(error) {}
	}
	m := Start(operation, 0, instanceID, pool)
	m.Stage(operation, pool)
	return m.Finish
}
func Stage(ctx context.Context, stage string, pool *sql.DB) {
	if m := FromContext(ctx); m != nil {
		m.Stage(stage, pool)
	}
}

type Monitor struct {
	requestID  string
	mu         sync.Mutex
	start      time.Time
	operation  string
	tableID    int
	instanceID int
	stage      string
	pool       *sql.DB
	timer      *time.Timer
	timerDone  chan struct{}
	finishOnce sync.Once
	threshold  time.Duration
}

func Start(operation string, tableID, instanceID int, pool *sql.DB) *Monitor {
	m := &Monitor{requestID: strconv.FormatUint(monitorSequence.Add(1), 10), start: time.Now(), operation: operation, tableID: tableID, instanceID: instanceID, pool: pool, threshold: SlowThreshold(), timerDone: make(chan struct{})}
	m.timer = time.AfterFunc(m.threshold, func() { defer close(m.timerDone); m.report("waiting", nil) })
	return m
}
func (m *Monitor) Stage(stage string, pool *sql.DB) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.stage = stage
	m.pool = pool
}
func (m *Monitor) Instance(id int) { m.mu.Lock(); defer m.mu.Unlock(); m.instanceID = id }
func (m *Monitor) Finish(err error) {
	m.finishOnce.Do(func() {
		if m.timer.Stop() {
			close(m.timerDone)
		}
		<-m.timerDone
		if err != nil || time.Since(m.start) >= m.threshold {
			m.report("finished", err)
		}
	})
}

func (m *Monitor) report(state string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	stats := sql.DBStats{}
	if m.pool != nil {
		stats = m.pool.Stats()
	}
	classification := ""
	if errors.Is(err, context.DeadlineExceeded) {
		classification = "deadline_exceeded"
	} else if errors.Is(err, context.Canceled) {
		classification = "canceled"
	} else if err != nil {
		classification = "query_failed"
	}
	elog.Warn("querySlow", elog.String("request_id", m.requestID), elog.String("operation", m.operation), elog.String("stage", m.stage), elog.String("state", state),
		elog.Int("table_id", m.tableID), elog.Int("instance_id", m.instanceID), elog.Duration("elapsed", time.Since(m.start)),
		elog.Int("in_use", stats.InUse), elog.Int("idle", stats.Idle), elog.Int("max_open", stats.MaxOpenConnections),
		elog.Int64("wait_count", stats.WaitCount), elog.Duration("wait_duration", stats.WaitDuration), elog.String("error", classification))
}
