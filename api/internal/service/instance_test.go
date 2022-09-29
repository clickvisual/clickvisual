package service

import (
	"database/sql"
	"errors"
	"net/url"
	"os"
	"reflect"
	"testing"

	_ "github.com/ClickHouse/clickhouse-go/v2"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func TestMain(m *testing.M) {
	invoker.Logger = elog.DefaultLogger
	os.Exit(m.Run())
}

func Test_clickHouseLink(t *testing.T) {
	type args struct {
		dsn string
	}
	tests := []struct {
		name    string
		args    args
		wantDb  *sql.DB
		wantErr error
	}{
		// TODO: Add test cases.
		{
			name: "use http scheme",
			args: args{
				dsn: "http://127.0.0.1:8123?username=root&password=shimo",
			},
		},
		{
			name: "use https scheme", // localhost server no tls
			args: args{
				dsn: "https://127.0.0.1:8123?username=root&password=shimo&secure=true",
			},
			wantErr: &url.Error{
				Op:  "Post",
				URL: "https://root:***@127.0.0.1:8123?database=default&default_format=Native",
				Err: errors.New("http: server gave HTTP response to HTTPS client"),
			},
		},
		{
			name: "use tcp scheme",
			args: args{
				dsn: "tcp://127.0.0.1:9000?username=root&password=shimo",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ClickHouseLink(tt.args.dsn)
			if !reflect.DeepEqual(err, tt.wantErr) {
				t.Errorf("ClickHouseLink() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
