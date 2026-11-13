package databend

import (
	"context"
	"database/sql/driver"
	"errors"
	"github.com/clickvisual/clickvisual/api/internal/pkg/testutil"
	"github.com/gotomicro/ego/core/econf"
	"testing"
	"time"
)

func TestMetadataRowsCloseAndIterationErrors(t *testing.T) {
	for _, scanFailure := range []bool{true, false} {
		t.Run(map[bool]string{true: "scan", false: "iteration"}[scanFailure], func(t *testing.T) {
			fault := errors.New("stream interrupted")
			rows := &testutil.Rows{Names: []string{"a"}, Err: fault}
			if scanFailure {
				rows.Names = []string{"a", "b"}
				rows.Values = [][]driver.Value{{"x", "y"}}
			}
			d := &testutil.SQLDriver{Query: func(context.Context, string) (driver.Rows, error) { return rows, nil }}
			conn := d.Open()
			defer conn.Close()
			_, err := (&Databend{db: conn}).GetCreateSQL("db", "table")
			if err == nil || (!scanFailure && !errors.Is(err, fault)) {
				t.Fatalf("error lost: %v", err)
			}
			if !rows.Closed.Load() || conn.Stats().InUse != 0 {
				t.Fatalf("rows leaked: %+v", conn.Stats())
			}
		})
	}
}
func TestQueryConfiguredTimeout(t *testing.T) {
	econf.Set("app.queryTimeout", "20ms")
	defer econf.Set("app.queryTimeout", nil)
	d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) { <-ctx.Done(); return nil, ctx.Err() }}
	conn := d.Open()
	defer conn.Close()
	start := time.Now()
	_, err := (&Databend{db: conn}).doQuery("select 1")
	if !errors.Is(err, context.DeadlineExceeded) || time.Since(start) > time.Second {
		t.Fatalf("timeout missing: %v", err)
	}
}
