package service

import (
	"database/sql"
	"testing"
)

func Test_clickHouseLink(t *testing.T) {
	type args struct {
		dsn string
	}
	tests := []struct {
		name    string
		args    args
		wantDb  *sql.DB
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "test-http",
			args: args{
				dsn: "http://127.0.0.1:8123",
			},
			wantDb:  nil,
			wantErr: false,
		},
		{
			name: "test-tcp",
			args: args{
				dsn: "tcp://127.0.0.1:9000",
			},
			wantDb:  nil,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ClickHouseLink(tt.args.dsn)
			if (err != nil) != tt.wantErr {
				t.Errorf("ClickHouseLink() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}

func Test_clickhouseDsnConvert(t *testing.T) {
	type args struct {
		req string
	}
	tests := []struct {
		name    string
		args    args
		wantRes string
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				req: "tcp://host1:9000?username=username&password=password&read_timeout=10&write_timeout=20&debug=true&max_execution_time=30",
			},
			wantRes: "clickhouse://username:password@host1:9000/default?debug=true&max_execution_time=30&read_timeout=10&write_timeout=20",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if gotRes := clickhouseDsnConvert(tt.args.req); gotRes != tt.wantRes {
				t.Errorf("clickhouseDsnConvert() = %v, want %v", gotRes, tt.wantRes)
			}
		})
	}
}
