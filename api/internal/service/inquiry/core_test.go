package inquiry

import (
	"testing"
)

func Test_dayTime2Timestamp(t *testing.T) {
	type args struct {
		in string
	}
	tests := []struct {
		name string
		args args
		want int64
	}{
		{
			name: "test-1",
			args: args{
				in: "2022-01-11T17:39:49+08:00",
			},
			want: 1641893989,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := dayTime2Timestamp(tt.args.in, "'2006-01-02T15:04:05+08:00'"); got != tt.want {
				t.Errorf("dayTime2Timestamp() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_queryTransformer(t *testing.T) {
	type args struct {
		in string
	}
	tests := []struct {
		name    string
		args    args
		wantOut string
		wantErr bool
	}{
		{
			name: "test-1",
			args: args{
				in: "_namespace_='kube-system' and _log_agent_='fluent-bit-8w7qh' and _time_='2022-01-11T17:39:49+08:00'",
			},
			wantOut: "_namespace_='kube-system' and _log_agent_='fluent-bit-8w7qh' and _time_='1641893989'",
			wantErr: false,
		}, {
			name: "test-2",
			args: args{
				in: "_namespace_='kube-system'",
			},
			wantOut: "_namespace_='kube-system'",
			wantErr: false,
		}, {
			name: "test-3",
			args: args{
				in: "_namespace_ like '%kube-system%'",
			},
			wantOut: "_namespace_ like '%kube-system%'",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotOut, err := queryTransformer(tt.args.in)
			if (err != nil) != tt.wantErr {
				t.Errorf("queryTransformer() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if gotOut != tt.wantOut {
				t.Errorf("queryTransformer() gotOut = %v, want %v", gotOut, tt.wantOut)
			}
		})
	}
}
