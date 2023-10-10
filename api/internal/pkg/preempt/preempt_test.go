package preempt

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/BurntSushi/toml"
	"github.com/ego-component/eredis"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func init() {
	wd, _ := os.Getwd()
	for !strings.HasSuffix(wd, "ws-api") {
		wd = filepath.Dir(wd)
	}
	f, err := os.Open(wd + "/config/local.toml")
	if err != nil {
		panic(err)
	}
	defer func() { _ = f.Close() }()
	err = econf.LoadFromReader(f, toml.Unmarshal)
	if err != nil {
		panic(err)
	}
	_ = invoker.Init()
}

func TestNewPreempt(t *testing.T) {
	type args struct {
		ctx context.Context
		db  *eredis.Component
		key string
	}
	tests := []struct {
		name string
		args args
		want *Preempt
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				ctx: context.Background(),
				db:  invoker.Redis,
				key: "mogo",
			},
			want: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for i := 0; i < 10; i++ {
				sf := func() {
					for {
						time.Sleep(time.Second * 3)
						fmt.Printf("i am working... id is %d\n", i)
					}
				}
				ef := func() {
					fmt.Printf("i will go to sleep... id is %d\n", i)
				}
				go func() {
					p := NewPreempt(tt.args.ctx, tt.args.db, tt.args.key, sf, ef)
					time.Sleep(time.Minute)
					p.Close()
				}()
			}
		})
	}
	time.Sleep(time.Minute + time.Second*10)
}
