package databend

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/testutil"
	godatabend "github.com/databendcloud/databend-go"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func response(next string, data [][]any) godatabend.QueryResponse {
	return godatabend.QueryResponse{Id: "test-query", State: "Succeeded", NextURI: next, Data: data,
		Schema: godatabend.DataSchema{Fields: []godatabend.DataField{{Name: "value", DataType: godatabend.TypeDetail{Type: "Int64"}}}}}
}
func TestQueryRealHTTPDeadline(t *testing.T) {
	for _, where := range []string{"headers", "body", "page"} {
		t.Run(where, func(t *testing.T) {
			var canceled atomic.Bool
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				io.Copy(io.Discard, r.Body)
				if r.URL.Path == "/v1/query" && where == "page" {
					json.NewEncoder(w).Encode(response("/page", nil))
					return
				}
				if where == "body" {
					w.Header().Set("Content-Type", "application/json")
					w.Write([]byte(`{"data":`))
					w.(http.Flusher).Flush()
				}
				<-r.Context().Done()
				canceled.Store(true)
			}))
			defer server.Close()
			conn, err := OpenDB("databend://root@" + strings.TrimPrefix(server.URL, "http://") + "?sslmode=disable")
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			conn.SetMaxOpenConns(1)
			ctx, cancel := context.WithTimeout(context.Background(), 35*time.Millisecond)
			defer cancel()
			start := time.Now()
			rows, err := conn.QueryContext(ctx, "SELECT value")
			if err == nil {
				for rows.Next() {
				}
				err = rows.Err()
				rows.Close()
			}
			if !errors.Is(err, context.DeadlineExceeded) || time.Since(start) > time.Second {
				t.Fatalf("unbounded %s: %v", where, err)
			}
			until := time.Now().Add(time.Second)
			for (!canceled.Load() || conn.Stats().InUse != 0) && time.Now().Before(until) {
				time.Sleep(time.Millisecond)
			}
			if !canceled.Load() || conn.Stats().InUse != 0 {
				t.Fatalf("HTTP/connection leaked: canceled=%v stats=%+v", canceled.Load(), conn.Stats())
			}
		})
	}
}
func TestQueryRealHTTPCancelCloseAndReuse(t *testing.T) {
	var pages atomic.Int64
	entered := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/page" {
			pages.Add(1)
			<-r.Context().Done()
			return
		}
		var req godatabend.QueryRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.SQL == "SELECT block" {
			entered <- struct{}{}
			<-r.Context().Done()
			return
		}
		user, _, ok := r.BasicAuth()
		if !ok || user != "root" {
			t.Error("authentication lost")
		}
		json.NewEncoder(w).Encode(response("/page", [][]any{{"42"}}))
	}))
	defer server.Close()
	conn, err := OpenDB("databend://root@" + strings.TrimPrefix(server.URL, "http://") + "?sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		rows, e := conn.QueryContext(ctx, "SELECT block")
		if rows != nil {
			rows.Close()
		}
		done <- e
	}()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("request not started")
	}
	cancel()
	select {
	case err = <-done:
	case <-time.After(time.Second):
		t.Fatal("cancel did not stop HTTP")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("cancel cause lost: %v", err)
	}
	for i := 0; i < 3; i++ {
		rows, err := conn.QueryContext(context.Background(), "SELECT value")
		if err != nil {
			t.Fatal(err)
		}
		var got int64
		if !rows.Next() {
			t.Fatal(rows.Err())
		}
		if err = rows.Scan(&got); err != nil || got != 42 {
			t.Fatalf("parser/type lost %d %v", got, err)
		}
		start := time.Now()
		if err = rows.Close(); err != nil || time.Since(start) > 100*time.Millisecond {
			t.Fatalf("close blocked: %v", err)
		}
	}
	if pages.Load() != 0 || conn.Stats().InUse != 0 {
		t.Fatalf("close fetched page or leaked: pages=%d stats=%+v", pages.Load(), conn.Stats())
	}
}
func TestMetadataDatabendConstructionUsesRequestDeadline(t *testing.T) {
	for _, where := range []string{"fields", "hash"} {
		t.Run(where, func(t *testing.T) {
			d := &testutil.SQLDriver{Query: func(ctx context.Context, _ string) (driver.Rows, error) {
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case <-time.After(200 * time.Millisecond):
					return &testutil.Rows{Names: []string{"id"}}, nil
				}
			}}
			pool := d.Open()
			defer pool.Close()
			metadata, err := gorm.Open(mysql.New(mysql.Config{Conn: pool, SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
			if err != nil {
				t.Fatal(err)
			}
			old := invoker.Db
			invoker.Db = metadata
			defer func() { invoker.Db = old }()
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
			defer cancel()
			start := time.Now()
			if where == "fields" {
				genSelectFieldsContext(ctx, 1)
			} else {
				queryTransformHash(view.ReqQuery{Context: ctx, Tid: 1, Query: "1=1"})
			}
			if time.Since(start) > 100*time.Millisecond {
				t.Fatal("metadata ignored request context")
			}
		})
	}
}

func TestQueryRealHTTPInitialSchemaAndEmptyPages(t *testing.T) {
	var calls atomic.Int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.Copy(io.Discard, r.Body)
		switch calls.Add(1) {
		case 1:
			json.NewEncoder(w).Encode(godatabend.QueryResponse{Id: "q", State: "Running", NextURI: "/schema"})
		case 2:
			json.NewEncoder(w).Encode(response("/empty", nil))
		case 3:
			json.NewEncoder(w).Encode(response("/data", nil))
		default:
			json.NewEncoder(w).Encode(response("", [][]any{{"42"}}))
		}
	}))
	defer server.Close()
	conn, err := OpenDB("databend://root@" + strings.TrimPrefix(server.URL, "http://") + "?sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	rows, err := conn.QueryContext(ctx, "SELECT value")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var value int64
	if !rows.Next() {
		t.Fatalf("empty page ended rows: %v", rows.Err())
	}
	if err = rows.Scan(&value); err != nil || value != 42 {
		t.Fatalf("schema/value lost: %d %v", value, err)
	}
	if rows.Next() || rows.Err() != nil || calls.Load() != 4 || conn.Stats().InUse != 0 {
		t.Fatalf("pagination/EOF leaked: err=%v calls=%d stats=%+v", rows.Err(), calls.Load(), conn.Stats())
	}
}
