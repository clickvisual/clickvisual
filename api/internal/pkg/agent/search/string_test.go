package search

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
)

func TestKeyword2Array(t *testing.T) {
	type args struct {
		keyword string
	}
	tests := []struct {
		name string
		args args
		want []KeySearch
	}{
		// TODO: Add test cases.
		{
			name: "test-1",
			args: args{
				keyword: `lv='info' and msg="hello" and size=10 and xyz`,
			},
			want: []KeySearch{
				{
					Key:   "lv",
					Value: "info",
					Type:  typeString,
				},
				{
					Key:   "msg",
					Value: "hello",
					Type:  typeString,
				},
				{
					Key:   "size",
					Value: "10",
					Type:  typeInt,
				},
				{
					Key:   "",
					Value: "xyz",
					Type:  typeString,
				},
			},
		},
		{
			name: "test-2",
			args: args{
				keyword: "`_file`='/var/log/pods/co-dev-arm_egocron-worker-84d779b844-8wqng_6c423fc0-dd2f-403c-9d42-eaa14760cde3/egocron/0.log'",
			},
			want: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Keyword2Array(tt.args.keyword, false); !reflect.DeepEqual(got, tt.want) {
				for _, t := range got {
					var tmp string
					switch TrimKeyWord(t.Key) {
					case InnerKeyFile:
						tmp = TrimKeyWord(strings.TrimSpace(t.Value.(string)))
					case InnerKeyNamespace:
						tmp = TrimKeyWord(strings.TrimSpace(t.Value.(string)))
					}
					fmt.Println("tmp", tmp)
				}

				t.Errorf("Keyword2Array() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSearchTime(t *testing.T) {
	f, _ := OpenFile("./agent.sys")
	cmp := Component{
		startTime: 1698834726,
		endTime:   1698921126,
		file:      f,
	}
	i, err := searchByStartTime(cmp.file, cmp.startTime)
	if err != nil {
		panic(err)
	}
	fmt.Println("response: -> ", i)
	// i, err = searchByEndTime(cmp.file, 0, cmp.endTime)
	// if err != nil {
	// 	panic(err)
	// }
	// fmt.Println("response: -> ", i)
}
