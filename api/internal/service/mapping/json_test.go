package mapping

import (
	"reflect"
	"testing"

	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Test_mapping(t *testing.T) {
	type args struct {
		input string
	}
	tests := []struct {
		name string
		args args
		want view.MappingStruct
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				input: `{"Followers":8900}`,
			},
			want: view.MappingStruct{
				Data: []view.MappingStructItem{
					{
						Key:   "Followers",
						Value: "Float64",
					},
				},
			},
		},
		{
			name: "test-2",
			args: args{
				input: `{"Name":"gopher"}`,
			},
			want: view.MappingStruct{
				Data: []view.MappingStructItem{
					{
						Key:   "Name",
						Value: "String",
					},
				},
			},
		},
		{
			name: "test-3",
			args: args{
				input: `{"IsAdmin":false}`,
			},
			want: view.MappingStruct{
				Data: []view.MappingStructItem{
					{
						Key:   "IsAdmin",
						Value: "Bool",
					},
				},
			},
		},
		{
			name: "test-4",
			args: args{
				input: `{"tags": [
        {
            "key": "otel.library.name",
            "vStr": "enter_file"
        },
        {
            "key": "http.client_ip",
            "vStr": "219.233.199.199"
        }
]}`,
			},
			want: view.MappingStruct{
				Data: []view.MappingStructItem{
					{
						Key:   "tags",
						Value: "Array(String)",
					},
				},
			},
		},
		{
			name: "test-4",
			args: args{
				input: `{    "process": {
        "serviceName": "frontend",
        "tags": [
            {
                "key": "telemetry.sdk.language",
                "vStr": "webjs"
            },
            {
                "key": "telemetry.sdk.name",
                "vStr": "opentelemetry"
            },
            {
                "key": "telemetry.sdk.version",
                "vStr": "1.8.0"
            }
        ]
    }}`,
			},
			want: view.MappingStruct{
				Data: []view.MappingStructItem{
					{
						Key:   "process",
						Value: "String",
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
