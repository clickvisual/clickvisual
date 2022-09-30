package service

import (
	"database/sql"
	"errors"
	"fmt"
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
	// The username may contain Latin letters, numbers, hyphens, and underscores, but must begin with a letter or an underscore.
	user := "root-_123"
	// The password must be between 8 and 128 characters.
	passwd := url.QueryEscape("shimo*!@#")

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
				dsn: fmt.Sprintf("http://127.0.0.1:8123?username=%s&password=%s", user, passwd),
			},
		},
		{
			name: "use https scheme", // localhost server no tls
			args: args{
				dsn: fmt.Sprintf("https://127.0.0.1:8123?username=%s&password=%s&secure=true", user, passwd),
			},
			wantErr: &url.Error{
				Op:  "Post",
				URL: fmt.Sprintf("https://%s:***@127.0.0.1:8123?database=default&default_format=Native", user),
				Err: errors.New("http: server gave HTTP response to HTTPS client"),
			},
		},
		{
			name: "use basic auth http scheme",
			args: args{
				dsn: fmt.Sprintf("http://%s:%s@127.0.0.1:8123", user, passwd),
			},
		},
		{
			name: "use basic auth https scheme", // localhost server no tls
			args: args{
				dsn: fmt.Sprintf("https://%s:%s@127.0.0.1:8123?secure=true", user, passwd),
			},
			wantErr: &url.Error{
				Op:  "Post",
				URL: fmt.Sprintf("https://%s:***@127.0.0.1:8123?database=default&default_format=Native", user),
				Err: errors.New("http: server gave HTTP response to HTTPS client"),
			},
		},
		{
			name: "use tcp scheme",
			args: args{
				dsn: fmt.Sprintf("tcp://127.0.0.1:9000?username=%s&password=%s", user, passwd),
			},
		},
		{
			name: "use clickhouse scheme",
			args: args{
				dsn: fmt.Sprintf("clickhouse://%s:%s@127.0.0.1:9000", user, passwd),
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
