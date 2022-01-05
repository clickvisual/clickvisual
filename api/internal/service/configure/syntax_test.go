package configure

import (
	"testing"

	"github.com/shimohq/mogo/api/pkg/model/view"
)

func TestCheckSyntax(t *testing.T) {
	type args struct {
		format  view.ConfigFormat
		content string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "INI syntax check",
			args: args{
				format: view.ConfigFormatIni,
				content: `[hello]
						a= 1
						1234`,
			},
			wantErr: true,
		},
		{
			name: "INI syntax check",
			args: args{
				format: view.ConfigFormatIni,
				content: `[hello]
						a= 1
						avc= 1234`,
			},
			wantErr: false,
		},
		{
			name: "YAML syntax check",
			args: args{
				format: view.ConfigFormatYaml,
				content: `hello:
  nihao: 1
  list:
    - item: 1
    - item: 2
`,
			},
			wantErr: false,
		},
		{
			name: "YAML syntax check",
			args: args{
				format: view.ConfigFormatYaml,
				content: `hello:
  nihao: 1
  list:
    - item: 1
    - item: {
`,
			},
			wantErr: true,
		},
		{
			name: "TOML syntax check",
			args: args{
				format: view.ConfigFormatToml,
				content: `[config]
key = 123
value = 123
list = [1, 2, 3]`,
			},
			wantErr: false,
		},
		{
			name: "TOML syntax check",
			args: args{
				format: view.ConfigFormatToml,
				content: `[config]
key = 123
value = asdas 123
list = [1, 2, 3`,
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := CheckSyntax(tt.args.format, tt.args.content); (err != nil) != tt.wantErr {
				t.Errorf("CheckSyntax() error = %v, wantErr %v", err, tt.wantErr)
			} else {
				t.Logf("err = %v", err)
			}
		})
	}
}
