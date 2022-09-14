package node

import (
	"reflect"
	"testing"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func Test_dagEdgeExecFlow(t *testing.T) {
	invoker.Logger = elog.DefaultLogger
	invoker.Logger.SetLevel(-1)
	type args struct {
		nodeId int
		req    []view.ReqDagEdge
	}
	tests := []struct {
		name    string
		args    args
		wantRes []view.DagExecFlow
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				nodeId: dagStart,
				req: []view.ReqDagEdge{
					{
						Source: "-1",
						Target: "1",
					},
					{
						Source: "1",
						Target: "2",
					},
					{
						Source: "1",
						Target: "3",
					},
					{
						Source: "2",
						Target: "-2",
					},
					{
						Source: "3",
						Target: "-2",
					},
				},
			},
			wantRes: []view.DagExecFlow{
				{
					NodeId: -1,
					Children: []view.DagExecFlow{
						{
							NodeId: 1,
							Children: []view.DagExecFlow{
								{
									NodeId:   2,
									Children: make([]view.DagExecFlow, 0),
								},
								{
									NodeId:   3,
									Children: make([]view.DagExecFlow, 0),
								},
							},
						},
					},
				},
			},
		},
		{
			name: "test-2",
			args: args{
				nodeId: dagStart,
				req: []view.ReqDagEdge{
					{
						Source: "-1",
						Target: "1",
					},
					{
						Source: "1",
						Target: "2",
					},
					{
						Source: "1",
						Target: "3",
					},
					{
						Source: "2",
						Target: "-2",
					},
				},
			},
			wantRes: []view.DagExecFlow{
				{
					NodeId: -1,
					Children: []view.DagExecFlow{
						{
							NodeId: 1,
							Children: []view.DagExecFlow{
								{
									NodeId:   2,
									Children: make([]view.DagExecFlow, 0),
								},
								{
									NodeId:   3,
									Children: make([]view.DagExecFlow, 0),
								},
							},
						},
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if gotRes := dagEdgeExecFlow(tt.args.nodeId, tt.args.req); !reflect.DeepEqual(gotRes, tt.wantRes) {
				t.Errorf("dagEdgeExecFlow() = %v, want %v", gotRes, tt.wantRes)
				invoker.Logger.Debug("gotRes", elog.Any("gotRes", gotRes))
			} else {
				invoker.Logger.Debug("gotRes", elog.Any("gotRes", gotRes))
			}
		})
	}
}
