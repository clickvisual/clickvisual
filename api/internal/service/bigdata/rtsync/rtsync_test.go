package rtsync

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/BurntSushi/toml"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func init() {
	wd, _ := os.Getwd()
	for !strings.HasSuffix(wd, "clickvisual") {
		wd = filepath.Dir(wd)
	}
	fmt.Println("path: ", wd+"/configs/local.toml")
	f, err := os.Open(wd + "/configs/local.toml")
	if err != nil {
		panic(err)
	}
	defer func() { _ = f.Close() }()
	err = econf.LoadFromReader(f, toml.Unmarshal)
	if err != nil {
		panic(err)
	}
	invoker.Init()
}

func TestCreator(t *testing.T) {
	type args struct {
		iid     int
		nodeId  int
		content string
	}
	tests := []struct {
		name    string
		args    args
		want    RTSync
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				iid:    1,
				nodeId: 104,
				content: `{
    "source": {
        "typ": "clickhouse",
        "database": "metrics",
        "table": "samples"
    },
    "target": {
        "typ": "mysql",
        "sourceId": 3,
        "database": "ws_gateway",
        "table": "number_sender"
    },
    "mapping": [
        {
            "source": "name",
            "target": "gateway_ip"
        },{
            "source": "val",
            "target": "online"
        }
    ]
}`,
			},
			want:    nil,
			wantErr: false,
		},
		{
			name: "test-2",
			args: args{
				iid:    1,
				nodeId: 105,
				content: `{
    "target": {
        "typ": "clickhouse",
        "database": "local_mex",
        "table": "test_0628_1"
    },
    "source": {
        "typ": "mysql",
        "sourceId": 3,
        "database": "ws_gateway",
        "table": "number_sender"
    },
    "mapping": [
        {
            "source": "gateway_ip",
            "target": "_raw_log_"
        }
    ]
}`,
			},
			want:    nil,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Creator(tt.args.iid, tt.args.nodeId, tt.args.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("Creator() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			_, err = got.Run()
			if (err != nil) != tt.wantErr {
				t.Errorf("Run() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
