package inquiry

import (
	"testing"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func Test_hashTransform(t *testing.T) {
	type args struct {
		query string
		index *db.Index
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
				query: "application='xx-xxx' and url='123'",
				index: &db.Index{
					Field:   "application",
					HashTyp: 1,
				},
			},
			want: "_inner_siphash_application_=sipHash64('xx-xxx') and url='123'",
		},
		{
			name: "test-2",
			args: args{
				query: "url='123' and application='xx-xxx' and url='123'",
				index: &db.Index{
					Field:   "application",
					HashTyp: 2,
				},
			},
			want: "url='123' and _inner_urlhash_application_=URLHash('xx-xxx') and url='123'",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := hashTransform(tt.args.query, tt.args.index); got != tt.want {
				t.Errorf("hashTransform() = %v, want %v", got, tt.want)
			}
		})
	}
}
