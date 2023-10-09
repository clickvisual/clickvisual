package node

import (
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func Test_argsReplaces(t *testing.T) {
	type args struct {
		replaces []view.ReqCrontabArg
		sql      string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				replaces: []view.ReqCrontabArg{
					{
						Key: "k1",
						Val: "database",
					},
				},
				sql: "hello ${k1} world",
			},
			want: "hello database world",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := argsReplaces(tt.args.replaces, tt.args.sql); got != tt.want {
				t.Errorf("argsReplaces() = %v, want %v", got, tt.want)
			}
		})
	}
}
