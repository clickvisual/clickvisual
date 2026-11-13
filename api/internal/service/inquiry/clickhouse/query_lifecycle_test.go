package clickhouse

import (
	"context"
	"database/sql/driver"
	"errors"
	"fmt"
	chdriver "github.com/ClickHouse/clickhouse-go/v2"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"sync/atomic"
	"testing"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/queryguard"
	"github.com/clickvisual/clickvisual/api/internal/pkg/testutil"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestQueryConfiguredTimeout(t *testing.T) {
	econf.Set("app.queryTimeout", "20ms")
	defer econf.Set("app.queryTimeout", nil)
	d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(150 * time.Millisecond):
			return &testutil.Rows{Names: []string{"value"}}, nil
		}
	}}
	conn := d.Open()
	defer conn.Close()
	c := &ClickHouseX{db: conn}
	_, err := c.DoSQLContext(context.Background(), "select value")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected query deadline, got %v", err)
	}
}
func TestMetadataRowsClosedOnScanFailure(t *testing.T) {
	rows := &testutil.Rows{Names: []string{"a", "b"}, Values: [][]driver.Value{{"x", "y"}}}
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) { return rows, nil }}
	conn := d.Open()
	defer conn.Close()
	c := &ClickHouseX{db: conn}
	_, err := c.Version()
	if err == nil {
		t.Fatal("expected scan failure")
	}
	if !rows.Closed.Load() || conn.Stats().InUse != 0 {
		t.Fatalf("rows leaked: %+v", conn.Stats())
	}
}
func TestMetadataIterationError(t *testing.T) {
	fault := errors.New("broken stream")
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) {
		return &testutil.Rows{Names: []string{"version"}, Err: fault}, nil
	}}
	conn := d.Open()
	defer conn.Close()
	c := &ClickHouseX{db: conn}
	_, err := c.Version()
	if !errors.Is(err, fault) {
		t.Fatalf("iteration error lost: %v", err)
	}
}

func TestQueryPoolExhaustionIsBounded(t *testing.T) {
	econf.Set("app.queryTimeout", "25ms")
	defer econf.Set("app.queryTimeout", nil)
	var calls atomic.Int64
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) {
		calls.Add(1)
		return &testutil.Rows{Names: []string{"value"}}, nil
	}}
	conn := d.Open()
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	held, err := conn.Conn(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer held.Close()
	c := &ClickHouseX{db: conn}
	start := time.Now()
	_, err = c.DoSQL("select value")
	if !errors.Is(err, context.DeadlineExceeded) || time.Since(start) > time.Second {
		t.Fatalf("pool wait not bounded: %v", err)
	}
	if calls.Load() != 0 || conn.Stats().WaitCount == 0 {
		t.Fatalf("query reached driver while pool exhausted: %+v", conn.Stats())
	}
	held.Close()
	if _, err = c.DoSQL("select value"); err != nil {
		t.Fatalf("pool did not recover: %v", err)
	}
}
func TestQueryCancellationDoesNotRetry(t *testing.T) {
	var calls atomic.Int64
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) {
		calls.Add(1)
		cancel()
		<-ctx.Done()
		return nil, errors.New("driver canceled")
	}}
	conn := d.Open()
	defer conn.Close()
	c := &ClickHouseX{db: conn}
	_, err := c.DoSQLContext(ctx, "select value")
	if !errors.Is(err, context.Canceled) || calls.Load() != 1 {
		t.Fatalf("cancellation lost or retried: %v calls %d", err, calls.Load())
	}
}
func TestQueryRetriesShareDeadline(t *testing.T) {
	econf.Set("app.queryTimeout", "35ms")
	defer econf.Set("app.queryTimeout", nil)
	var calls atomic.Int64
	d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) {
		calls.Add(1)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(15 * time.Millisecond):
			return nil, &chdriver.Exception{Code: 516, Message: "password is incorrect"}
		}
	}}
	conn := d.Open()
	defer conn.Close()
	c := &ClickHouseX{db: conn}
	start := time.Now()
	_, err := c.DoSQL("select value")
	if !errors.Is(err, context.DeadlineExceeded) || time.Since(start) > 120*time.Millisecond || calls.Load() > 3 {
		t.Fatalf("retry reset budget: %v calls %d elapsed %s", err, calls.Load(), time.Since(start))
	}
}
func TestQueryOrdinaryErrorsDoNotRetry(t *testing.T) {
	var calls atomic.Int64
	fault := errors.New("syntax error")
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) { calls.Add(1); return nil, fault }}
	conn := d.Open()
	defer conn.Close()
	_, err := (&ClickHouseX{db: conn}).DoSQL("select 'password is incorrect'")
	if !errors.Is(err, fault) || calls.Load() != 1 {
		t.Fatalf("unexpected retry/error: %v calls %d", err, calls.Load())
	}
}

func setupQueryMetadata(t *testing.T) {
	t.Helper()
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) { return &testutil.Rows{Names: []string{"id"}}, nil }}
	conn := d.Open()
	metadata, err := gorm.Open(mysql.New(mysql.Config{Conn: conn, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
	if err != nil {
		t.Fatal(err)
	}
	old := invoker.Db
	invoker.Db = metadata
	t.Cleanup(func() { invoker.Db = old; conn.Close() })
}
func testQuery(ctx context.Context) view.ReqQuery {
	return view.ReqQuery{Context: ctx, Tid: 1, Database: "logs", Table: "stdout", DatabaseTable: "`logs`.`stdout`", TimeField: "_time_second_", ST: 1, ET: 2, Page: 1, PageSize: 10, Query: "1=1", GroupByCond: "toStartOfMinute(_time_second_)"}
}
func TestQueryLogsAndCountShareRequestBudget(t *testing.T) {
	setupQueryMetadata(t)
	ctx, cancel := context.WithTimeout(context.Background(), 75*time.Millisecond)
	defer cancel()
	var calls atomic.Int64
	d := &testutil.SQLDriver{Query: func(ctx context.Context, q string) (driver.Rows, error) {
		calls.Add(1)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(30 * time.Millisecond):
			return &testutil.Rows{Names: []string{"_time_second_"}}, nil
		}
	}}
	conn := d.Open()
	defer conn.Close()
	c := &ClickHouseX{db: conn}
	param := testQuery(ctx)
	start := time.Now()
	if _, err := c.GetLogs(param, 1); err != nil {
		t.Fatalf("logs failed before count: %v", err)
	}
	_, err := c.Count(param)
	if !errors.Is(err, context.DeadlineExceeded) || calls.Load() != 3 || time.Since(start) > 160*time.Millisecond {
		t.Fatalf("logs/timeline/count budget lost: %v calls %d elapsed %s", err, calls.Load(), time.Since(start))
	}
}
func TestQueryTimelineCancellationStopsFallback(t *testing.T) {
	setupQueryMetadata(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var calls atomic.Int64
	d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) {
		calls.Add(1)
		cancel()
		return nil, errors.New("driver canceled")
	}}
	conn := d.Open()
	defer conn.Close()
	_, err := (&ClickHouseX{db: conn}).GetLogs(testQuery(ctx), 1)
	if !errors.Is(err, context.Canceled) || calls.Load() != 1 {
		t.Fatalf("fallback after cancel: %v calls %d", err, calls.Load())
	}
}
func TestQueryChartUsesRequestCancellation(t *testing.T) {
	setupQueryMetadata(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) {
		cancel()
		<-ctx.Done()
		return nil, ctx.Err()
	}}
	conn := d.Open()
	defer conn.Close()
	_, _, err := (&ClickHouseX{db: conn}).Chart(testQuery(ctx))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("chart lost cancellation: %v", err)
	}
}

func TestMetadataOwnersCloseAndReportStreamErrors(t *testing.T) {
	for _, name := range []string{"cluster", "trace", "ddl"} {
		for _, scanFailure := range []bool{true, false} {
			t.Run(fmt.Sprintf("%s/scan=%v", name, scanFailure), func(t *testing.T) {
				fault := errors.New("read interrupted")
				rows := &testutil.Rows{Names: []string{"a"}, Err: fault}
				if scanFailure {
					rows.Names = []string{"a", "b"}
					rows.Values = [][]driver.Value{{"x", "y"}}
				}
				d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) { return rows, nil }}
				conn := d.Open()
				defer conn.Close()
				c := &ClickHouseX{db: conn}
				var err error
				switch name {
				case "cluster":
					_, err = c.ClusterInfo()
				case "ddl":
					_, err = c.GetCreateSQL("db", "table")
				case "trace":
					ctx := context.WithValue(context.Background(), "st", 1)
					ctx = context.WithValue(ctx, "et", 2)
					ctx = context.WithValue(ctx, "database", "db")
					ctx = context.WithValue(ctx, "table", "table")
					_, err = c.GetTraceGraph(ctx)
				}
				if err == nil || (!scanFailure && !errors.Is(err, fault)) {
					t.Fatalf("stream error lost: %v", err)
				}
				if !rows.Closed.Load() || conn.Stats().InUse != 0 {
					t.Fatalf("rows leaked: %+v", conn.Stats())
				}
			})
		}
	}
}

func TestQueryMetadataWaitReportsActualPoolAndRequest(t *testing.T) {
	econf.Set("app.querySlowThreshold", "5ms")
	defer econf.Set("app.querySlowThreshold", nil)
	core, logs := observer.New(zap.WarnLevel)
	oldLogger := elog.DefaultLogger
	elog.DefaultLogger = elog.DefaultContainer().Build(elog.WithZapCore(core))
	defer func() { elog.DefaultLogger = oldLogger }()
	metadataDriver := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) { <-ctx.Done(); return nil, ctx.Err() }}
	metadataPool := metadataDriver.Open()
	defer metadataPool.Close()
	metadata, err := gorm.Open(mysql.New(mysql.Config{Conn: metadataPool, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
	if err != nil {
		t.Fatal(err)
	}
	old := invoker.Db
	invoker.Db = metadata
	defer func() { invoker.Db = old }()
	queryPool := (&testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) {
		t.Error("query reached ClickHouse")
		return nil, errors.New("unexpected")
	}}).Open()
	defer queryPool.Close()
	m := queryguard.Start("TableLogs", 5, 7, queryPool)
	ctx, cancel := context.WithTimeout(queryguard.WithMonitor(context.Background(), m), 30*time.Millisecond)
	defer cancel()
	_, err = (&ClickHouseX{db: queryPool, id: 7}).GetLogs(testQuery(ctx), 5)
	m.Finish(err)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatal(err)
	}
	entries := logs.FilterField(zap.String("operation", "TableLogs")).All()
	if len(entries) < 2 {
		t.Fatalf("missing wait/completion %v", entries)
	}
	var requestID any
	for _, entry := range entries {
		f := entry.ContextMap()
		if f["table_id"] != int64(5) || f["instance_id"] != int64(7) || f["stage"] != "metadata" {
			t.Fatalf("wrong attribution: %v", f)
		}
		if requestID == nil {
			requestID = f["request_id"]
		}
		if requestID == "" || requestID != f["request_id"] {
			t.Fatalf("request correlation lost %v", f)
		}
		if f["state"] == "waiting" && f["in_use"] != int64(1) {
			t.Fatalf("wrong pool: %v", f)
		}
		if f["state"] == "finished" && f["error"] != "deadline_exceeded" {
			t.Fatalf("completion error lost %v", f)
		}
	}
}
