package utils

import (
	"reflect"
	"testing"
)

func TestGenerateFieldOrderRules(t *testing.T) {
	type args struct {
		sql string
	}
	tests := []struct {
		name  string
		args  args
		want  []string
		want1 bool
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				sql: `SELECT
  val,name,tags,ts
FROM
  metrics.samples
WHERE
  ts >= toDateTime(1666150326)
  AND ts < toDateTime(1666582326)
  AND (1 = '1')
ORDER BY
  ts DESC
LIMIT
  10
OFFSET
  0`,
			},
			want:  []string{"val", "name", "tags", "ts"},
			want1: true,
		},
		{
			name: "test-2",
			args: args{
				sql: `SELECT
  val as key,name,tags,ts
FROM
  metrics.samples
WHERE
  ts >= toDateTime(1666150326)
  AND ts < toDateTime(1666582326)
  AND (1 = '1')
ORDER BY
  ts DESC
LIMIT
  10
OFFSET
  0`,
			},
			want:  []string{"key", "name", "tags", "ts"},
			want1: true,
		},
		{
			name: "test-2",
			args: args{
				sql: `SELECT
  val as key,
  name ,
  tags  ,
  ts
FROM
  metrics.samples
WHERE
  ts >= toDateTime(1666150326)
  AND ts < toDateTime(1666582326)
  AND (1 = '1')
ORDER BY
  ts DESC
LIMIT
  10
OFFSET
  0`,
			},
			want:  []string{"key", "name", "tags", "ts"},
			want1: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, got1 := GenerateFieldOrderRules(tt.args.sql)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("GenerateFieldOrderRules() got = %v, want %v", got, tt.want)
			}
			if got1 != tt.want1 {
				t.Errorf("GenerateFieldOrderRules() got1 = %v, want %v", got1, tt.want1)
			}
		})
	}
}
