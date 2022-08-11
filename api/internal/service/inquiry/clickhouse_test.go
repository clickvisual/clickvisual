package inquiry

import (
	"testing"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func Test_hashTransform(t *testing.T) {
	invoker.Logger = elog.DefaultLogger
	invoker.Logger.SetLevel(elog.DebugLevel)
	type args struct {
		query string
		index *db.BaseIndex
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
				index: &db.BaseIndex{
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
				index: &db.BaseIndex{
					Field:   "application",
					HashTyp: 2,
				},
			},
			want: "url='123' and _inner_urlhash_application_=URLHash('xx-xxx') and url='123'",
		},
		{
			name: "test-3",
			args: args{
				query: "body.tag='123'",
				index: &db.BaseIndex{
					Field:    "tag",
					HashTyp:  2,
					RootName: "body",
				},
			},
			want: "_inner_urlhash_body.tag_=URLHash('123')",
		},
		{
			name: "test-4",
			args: args{
				query: "upstream_proxy_host='fabio-crm-api'",
				index: &db.BaseIndex{
					Field:    "upstream_proxy_host",
					HashTyp:  1,
					RootName: "",
					Alias:    "upstream_proxy_host",
				},
			},
			want: "_inner_siphash_upstream_proxy_host_=sipHash64('fabio-crm-api')",
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

func Test_adaSelectPart(t *testing.T) {
	type args struct {
		in string
	}
	tests := []struct {
		name    string
		args    args
		wantOut string
	}{
		{
			name: "test-1",
			args: args{
				in: `SELECT count(1)
from mogo_shimo_dev.shimodev_svc_front_tracker
WHERE ("_time_second_" >= toDateTime(NOW() - 3600)) AND ("_time_second_" < toDateTime(NOW()))   
limit 1`,
			},
			wantOut: `SELECT count(1)
,count(1) FROM mogo_shimo_dev.shimodev_svc_front_tracker
WHERE ("_time_second_" >= toDateTime(NOW() - 3600)) AND ("_time_second_" < toDateTime(NOW()))   
limit 1`,
		},
		{
			name: "test-2",
			args: args{
				in: `SELECT count(1),count(1)
from mogo_shimo_dev.shimodev_svc_front_tracker
WHERE ("_time_second_" >= toDateTime(NOW() - 3600)) AND ("_time_second_" < toDateTime(NOW()))   
limit 1`,
			},
			wantOut: `SELECT count(1),count(1)
from mogo_shimo_dev.shimodev_svc_front_tracker
WHERE ("_time_second_" >= toDateTime(NOW() - 3600)) AND ("_time_second_" < toDateTime(NOW()))   
limit 1`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if gotOut := adaSelectPart(tt.args.in); gotOut != tt.wantOut {
				t.Errorf("adaSelectPart() = %v, want %v", gotOut, tt.wantOut)
			}
		})
	}
}
