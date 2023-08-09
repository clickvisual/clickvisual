package source

import (
	"fmt"
	"reflect"
	"testing"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func TestInstantiate(t *testing.T) {
	type args struct {
		s *Source
	}
	tests := []struct {
		name string
		args args
		want Operator
	}{
		{
			name: "test-mysql",
			args: args{
				s: &Source{
					DSN:      "",
					URL:      "localhost:3306",
					UserName: "root",
					Password: "123456",
					Typ:      db.SourceTypMySQL,
				},
			},
			want: nil,
		},
		{
			name: "test-clickhouse",
			args: args{
				s: &Source{
					DSN:      "",
					URL:      "localhost:9000",
					UserName: "",
					Password: "",
					Typ:      db.SourceTypClickHouse,
				},
			},
			want: nil,
		},
		{
			name: "test-databend",
			args: args{
				s: &Source{
					DSN:      "http://root:root@localhost:8081/default",
					URL:      "localhost:8081",
					UserName: "root",
					Password: "root",
					Typ:      db.SourceDatabend,
				},
			},
			want: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			databases, got := Instantiate(tt.args.s).Databases()
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Instantiate() = %v, want %v", got, tt.want)
			}
			fmt.Println(databases)
			if len(databases) == 0 {
				return
			}
			tables, got := Instantiate(tt.args.s).Tables(databases[0])
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Instantiate() = %v, want %v", got, tt.want)
			}
			fmt.Println(tables)
			if len(tables) == 0 {
				return
			}
			if columns, got := Instantiate(tt.args.s).Columns(databases[0], tables[0]); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Instantiate() = %v, want %v", got, tt.want)
			} else {
				fmt.Println(columns)
			}
		})
	}
}
