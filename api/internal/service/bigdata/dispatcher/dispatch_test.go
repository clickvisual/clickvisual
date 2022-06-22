package dispatcher

import (
	"reflect"
	"testing"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Test_buildCronFn(t *testing.T) {
	invoker.Logger = elog.DefaultLogger

	type args struct {
		oc view.OfflineContent
	}
	tests := []struct {
		name string
		args args
		want error
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			want: nil,
			args: args{
				oc: view.OfflineContent{
					Source: view.IntegrationFlat{
						Typ:                "clickhouse",
						Id:                 "",
						Database:           "",
						Table:              "",
						SourceFilter:       "",
						SourceTimeField:    "",
						SourceTimeFieldTyp: 0,
					},
					Target: view.IntegrationFlat{
						Typ:                   "mysql",
						Id:                    "",
						Database:              "",
						Table:                 "",
						TargetPre:             "",
						TargetPost:            "",
						TargetPrimaryConflict: 0,
						TargetBatchSize:       0,
						TargetBatchNum:        0,
					},
					Mapping: view.IntegrationMapping{},
					Setting: view.IntegrationSetting{},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildCronFn(1, tt.args.oc)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Instantiate() = %v, want %v", got, tt.want)
			}
			select {}
		})
	}
}
