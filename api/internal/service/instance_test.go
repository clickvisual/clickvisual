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
			_, err := clickHouseLink(tt.args.dsn)
			if (err != nil) != tt.wantErr {
				t.Errorf("clickHouseLink() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
