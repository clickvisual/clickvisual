package mapping

import (
	"reflect"
	"testing"
)

func Test_mapping(t *testing.T) {
	type args struct {
		input string
	}
	tests := []struct {
		name string
		args args
		want List
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				input: `{"Followers":8900}`,
			},
			want: List{
				Data: []Item{
					{
						Key: "Followers",
						Typ: "Float64",
					},
				},
			},
		},
		{
			name: "test-2",
			args: args{
				input: `{"Name":"gopher"}`,
			},
			want: List{
				Data: []Item{
					{
						Key: "Name",
						Typ: "String",
					},
				},
			},
		},
		{
			name: "test-3",
			args: args{
				input: `{"IsAdmin":false}`,
			},
			want: List{
				Data: []Item{
					{
						Key: "IsAdmin",
						Typ: "Bool",
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
			want: List{
				Data: []Item{
					{
						Key: "tags",
						Typ: "Array(String)",
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
			want: List{
				Data: []Item{
					{
						Key: "process",
						Typ: "String",
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got, _ := Handle(tt.args.input, true); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("mapping() = %v, want %v", got, tt.want)
			}
		})
	}
}
