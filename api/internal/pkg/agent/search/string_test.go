package search

import (
	"fmt"
	"reflect"
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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Keyword2Array(tt.args.keyword, false); !reflect.DeepEqual(got, tt.want) {
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
