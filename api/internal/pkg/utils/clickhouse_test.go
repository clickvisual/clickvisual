package utils

import (
	"fmt"
	"net/url"
	"testing"
)

func TestClickhouseDsnConvert(t *testing.T) {
	// The username may contain Latin letters, numbers, hyphens, and underscores, but must begin with a letter or an underscore.
	user := "root-_123"
	// The password must be between 8 and 128 characters.
	passwd := url.QueryEscape("shimo*!@#")

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
				fmt.Sprintf("tcp://127.0.0.1:9000?username=%s&password=%s&read_timeout=10&debug=true", user, passwd),
			},
			fmt.Sprintf("clickhouse://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms", user, passwd),
		},
		{
			"remove unknown write_timeout on tcp",
			args{
				fmt.Sprintf("tcp://127.0.0.1:9000?username=%s&password=%s&debug=true&read_timeout=10&write_timeout=20ms", user, passwd),
			},
			fmt.Sprintf("clickhouse://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms", user, passwd),
		},
		{
			"remove unknown write_timeout on clickhouse",
			args{
				fmt.Sprintf("clickhouse://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms&write_timeout=20ms", user, passwd),
			},
			fmt.Sprintf("clickhouse://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms", user, passwd),
		},
		{
			"remove unknown write_timeout on http",
			args{
				fmt.Sprintf("http://127.0.0.1:9000/default?debug=true&password=%s&read_timeout=10ms&write_timeout=20ms&username=%s", user, passwd),
			},
			fmt.Sprintf("http://127.0.0.1:9000/default?debug=true&password=%s&read_timeout=10ms&username=%s", user, passwd),
		},
		{
			"remove unknown write_timeout on https",
			args{
				fmt.Sprintf("https://127.0.0.1:9000/default?debug=true&password=%s&read_timeout=10ms&write_timeout=20ms&secure=true&username=%s", user, passwd),
			},
			fmt.Sprintf("https://127.0.0.1:9000/default?debug=true&password=%s&read_timeout=10ms&secure=true&username=%s", user, passwd),
		},
		{
			"remove unknown write_timeout on http basic auth",
			args{
				fmt.Sprintf("http://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms&write_timeout=20ms", user, passwd),
			},
			fmt.Sprintf("http://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms", user, passwd),
		},
		{
			"remove unknown write_timeout on https basic auth",
			args{
				fmt.Sprintf("https://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms&write_timeout=20ms&secure=true", user, passwd),
			},
			fmt.Sprintf("https://%s:%s@127.0.0.1:9000/default?debug=true&read_timeout=10ms&secure=true", user, passwd),
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
