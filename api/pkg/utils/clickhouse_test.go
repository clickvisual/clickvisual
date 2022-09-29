package utils

import (
	"testing"
)

func TestClickhouseDsnConvert(t *testing.T) {
	type args struct {
		req string
	}
	tests := []struct {
		name    string
		args    args
		wantRes string
	}{
		{
			"tcp to clickhouse",
			args{
				"tcp://127.0.0.1:9000?username=clickvisual&password=clickvisual&read_timeout=10&debug=true",
			},
			"clickhouse://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms",
		},
		{
			"remove unknown write_timeout on tcp",
			args{
				"tcp://127.0.0.1:9000?username=clickvisual&password=clickvisual&debug=true&read_timeout=10&write_timeout=20ms",
			},
			"clickhouse://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms",
		},
		{
			"remove unknown write_timeout on clickhouse",
			args{
				"clickhouse://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms&write_timeout=20ms",
			},
			"clickhouse://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms",
		},
		{
			"remove unknown write_timeout on http",
			args{
				"http://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms&write_timeout=20ms",
			},
			"http://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms",
		},
		{
			"remove unknown write_timeout on https",
			args{
				"http://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms&write_timeout=20ms",
			},
			"http://clickvisual:clickvisual@127.0.0.1:9000/default?debug=true&read_timeout=10ms",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if gotRes := ClickhouseDsnConvert(tt.args.req); gotRes != tt.wantRes {
				t.Errorf("ClickhouseDsnConvert() =\ngot  %v\nwant %v", gotRes, tt.wantRes)
			}
		})
	}
}
