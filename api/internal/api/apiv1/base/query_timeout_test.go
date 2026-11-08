package base

import (
	"context"
	"database/sql/driver"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/testutil"
)

func TestQueryHandlersBoundInitialMetadata(t *testing.T) {
	econf.Set("app.queryTimeout", "20ms")
	defer econf.Set("app.queryTimeout", nil)
	d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) { <-ctx.Done(); return nil, ctx.Err() }}
	conn := d.Open()
	defer conn.Close()
	metadata, err := gorm.Open(mysql.New(mysql.Config{Conn: conn, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
	if err != nil {
		t.Fatal(err)
	}
	old := invoker.Db
	invoker.Db = metadata
	defer func() { invoker.Db = old }()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/tables/:id/logs", core.Handle(TableLogs))
	r.GET("/tables/:id/charts", core.Handle(TableCharts))
	for _, endpoint := range []string{"logs", "charts"} {
		t.Run(endpoint, func(t *testing.T) {
			w := httptest.NewRecorder()
			start := time.Now()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/tables/5/"+endpoint, nil))
			if !strings.Contains(w.Body.String(), "query timed out") || time.Since(start) > time.Second {
				t.Fatalf("metadata wait not bounded: %s", w.Body.String())
			}
			if conn.Stats().InUse != 0 {
				t.Fatalf("metadata connection leaked: %+v", conn.Stats())
			}
		})
	}
}

func TestQueryResponseRejectsCancellationAfterSuccessfulWork(t *testing.T) {
	for _, message := range []string{"", "empty chart SQL"} {
		for _, kind := range []string{"canceled", "deadline", "active"} {
			t.Run(kind+message, func(t *testing.T) {
				gin.SetMode(gin.TestMode)
				r := gin.New()
				r.GET("/query", core.Handle(func(c *core.Context) {
					ctx, cancel := context.WithCancel(c.Request.Context())
					defer cancel()
					// The downstream succeeded; cancellation occurs while preparing its response.
					data := map[string]any{"rows": []string{"ok"}}
					if kind == "canceled" {
						cancel()
					}
					if kind == "deadline" {
						var stop context.CancelFunc
						ctx, stop = context.WithDeadline(ctx, time.Now().Add(-time.Second))
						defer stop()
					}
					_ = writeQuerySuccess(c, ctx, message, data)
				}))
				w := httptest.NewRecorder()
				r.ServeHTTP(w, httptest.NewRequest("GET", "/query", nil))
				if kind == "active" {
					if !strings.Contains(w.Body.String(), `"code":0`) {
						t.Fatal(w.Body.String())
					}
					return
				}
				expected := "query canceled"
				if kind == "deadline" {
					expected = "query timed out"
				}
				if !strings.Contains(w.Body.String(), `"code":1`) || !strings.Contains(w.Body.String(), expected) {
					t.Fatalf("returned success after %s: %s", kind, w.Body.String())
				}
			})
		}
	}
}
