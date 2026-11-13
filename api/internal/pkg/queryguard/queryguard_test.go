package queryguard

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/testutil"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestTimeoutFallbackAndParentDeadline(t *testing.T) {
	for _, v := range []any{nil, "0s", "-1s"} {
		econf.Set("app.queryTimeout", v)
		if Timeout() != 30*time.Second {
			t.Fatalf("unsafe default for %v", v)
		}
	}
	defer econf.Set("app.queryTimeout", nil)
	econf.Set("app.queryTimeout", "1s")
	parent, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	ctx, stop := WithTimeout(parent)
	defer stop()
	pd, _ := parent.Deadline()
	cd, _ := ctx.Deadline()
	if !pd.Equal(cd) {
		t.Fatal("parent deadline extended")
	}
	<-ctx.Done()
	if !errors.Is(Error(ctx, nil), context.DeadlineExceeded) {
		t.Fatal("cause lost")
	}
}
func TestSlowMonitorReportsWaitingPoolAndStage(t *testing.T) {
	econf.Set("app.querySlowThreshold", "10ms")
	defer econf.Set("app.querySlowThreshold", nil)
	core, logs := observer.New(zap.WarnLevel)
	old := elog.DefaultLogger
	elog.DefaultLogger = elog.DefaultContainer().Build(elog.WithZapCore(core))
	defer func() { elog.DefaultLogger = old }()
	d := &testutil.SQLDriver{}
	conn := d.Open()
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	held, err := conn.Conn(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer held.Close()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	waiting := make(chan error, 1)
	go func() {
		c, e := conn.Conn(ctx)
		if c != nil {
			c.Close()
		}
		waiting <- e
	}()
	until := time.Now().Add(time.Second)
	for conn.Stats().WaitCount == 0 && time.Now().Before(until) {
		time.Sleep(time.Millisecond)
	}
	m := Start("TableLogs", 5, 1, conn)
	m.Stage("logs", conn)
	defer m.Finish(nil)
	until = time.Now().Add(time.Second)
	for logs.Len() == 0 && time.Now().Before(until) {
		time.Sleep(time.Millisecond)
	}
	if logs.Len() == 0 {
		t.Fatal("no in-flight slow log")
	}
	fields := logs.All()[0].ContextMap()
	for _, key := range []string{"in_use", "idle", "wait_count", "wait_duration", "elapsed", "max_open"} {
		if _, ok := fields[key]; !ok {
			t.Fatalf("missing pool field %s", key)
		}
	}
	if fields["stage"] != "logs" || fields["state"] != "waiting" || fields["in_use"] != int64(1) || fields["table_id"] != int64(5) {
		t.Fatalf("wrong diagnostic: %+v", fields)
	}
	cancel()
	<-waiting
}

type expiredSocketContext struct{ context.Context }

func (expiredSocketContext) Deadline() (time.Time, bool) { return time.Now().Add(-time.Second), true }
func TestTimeoutRecognizedBeforeContextTimerRuns(t *testing.T) {
	err := Error(expiredSocketContext{context.Background()}, errors.New("i/o timeout"))
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("deadline cause lost: %v", err)
	}
}

func TestSlowMonitorDoesNotLogQueryLiterals(t *testing.T) {
	core, logs := observer.New(zap.WarnLevel)
	old := elog.DefaultLogger
	elog.DefaultLogger = elog.DefaultContainer().Build(elog.WithZapCore(core))
	defer func() { elog.DefaultLogger = old }()
	m := Start("TableLogs", 5, 1, nil)
	m.Finish(errors.New("select secret_customer_value from logs"))
	fields := logs.All()[0].ContextMap()
	if strings.Contains(fmt.Sprint(fields), "secret_customer_value") {
		t.Fatalf("query leaked: %v", fields)
	}
	if fields["error"] != "query_failed" {
		t.Fatalf("missing error class: %v", fields)
	}
}
