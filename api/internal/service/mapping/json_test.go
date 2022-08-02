package mapping

import (
	"reflect"
	"testing"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func Test_mapping(t *testing.T) {
	invoker.Logger = elog.DefaultLogger

	type args struct {
		input string
	}
	tests := []struct {
		name string
		args args
		want StructMapping
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				input: `{"Name":"gopher","IsAdmin":false,"Followers":8900}`,
			},
			want: StructMapping{
				Data: []StructMappingItem{
					{
						Key:   "Name",
						Value: "String",
					},
					{
						Key:   "IsAdmin",
						Value: "Bool",
					},
					{
						Key:   "Followers",
						Value: "Float64",
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got, _ := Handle(tt.args.input); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("mapping() = %v, want %v", got, tt.want)
			}
		})
	}
}
