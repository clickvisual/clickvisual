package search

import (
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
					Key:   "xyz",
					Value: "",
					Type:  typeString,
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Keyword2Array(tt.args.keyword); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Keyword2Array() = %v, want %v", got, tt.want)
			}
		})
	}
}
