package search

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

//func TestKeyword2Array(t *testing.T) {
//	type args struct {
//		keyword string
//	}
//	tests := []struct {
//		name string
//		args args
//		want []CustomSearch
//	}{
//		// TODO: Add test cases.
//		{
//			name: "test-1",
//			args: args{
//				keyword: `lv='info' and msg='hello' and size=10 and xyz`,
//			},
//			want: []CustomSearch{
//				{
//					Key:   "lv",
//					Value: "info",
//					Type:  typeString,
//				},
//				{
//					Key:   "msg",
//					Value: "hello",
//					Type:  typeString,
//				},
//				{
//					Key:   "size",
//					Value: "10",
//					Type:  typeInt,
//				},
//				{
//					Key:   "",
//					Value: "xyz",
//					Type:  typeString,
//				},
//			},
//		},
//		{
//			name: "test-2",
//			args: args{
//				keyword: "`_file_`='/var/log/pods/co-dev-arm_egocron-worker-84d779b844-8wqng_6c423fc0-dd2f-403c-9d42-eaa14760cde3/egocron/0.log'",
//			},
//			want: nil,
//		},
//	}
//	for _, tt := range tests {
//		t.Run(tt.name, func(t *testing.T) {
//			if got := Keyword2Array(tt.args.keyword, false); !reflect.DeepEqual(got, tt.want) {
//				for _, t := range got {
//					var tmp string
//					switch TrimKeyWord(t.Key) {
//					case InnerKeyFile:
//						tmp = TrimKeyWord(strings.TrimSpace(t.Value.(string)))
//					case InnerKeyNamespace:
//						tmp = TrimKeyWord(strings.TrimSpace(t.Value.(string)))
//					}
//					fmt.Println("tmp", tmp)
//				}
//
//				t.Errorf("Keyword2Array() = %v, want %v", got, tt.want)
//			}
//		})
//	}
//}

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

func TestKeyword2Array1(t *testing.T) {
	keySearch, _, err := Keyword2Array("`lv`='info' and `msg`='hello' and `size`='10'")
	assert.NoError(t, err)
	fmt.Printf("keySearch--------------->"+"%+v\n", keySearch)
}

func TestKeyword2Array2(t *testing.T) {
	keySearch, _, err := Keyword2Array("`lv`='info' and `msg`='hello' and `size`=a10'")
	assert.NoError(t, err)
	fmt.Printf("keySearch--------------->"+"%+v\n", keySearch)
}

func TestKeyword2Array3(t *testing.T) {
	keySearch, _, err := Keyword2Array("`lv`='info' and `msg`='hello' and `size`>10")
	assert.NoError(t, err)
	fmt.Printf("keySearch--------------->"+"%+v\n", keySearch)
}

func TestKeyword2Array4(t *testing.T) {
	keySearch, _, err := Keyword2Array("`lv`='info' and `msg`='hello' and `size`>'10'")
	assert.NoError(t, err)
	fmt.Printf("keySearch--------------->"+"%+v\n", keySearch)
}

func TestKeyword2Array5(t *testing.T) {
	keySearch, systemSearch, err := Keyword2Array("`lv`='info' and `msg`='hello' and `size`='10' and `_file_`='ego.sys'")
	assert.NoError(t, err)
	fmt.Printf("keySearch--------------->"+"%+v\n", keySearch)
	fmt.Printf("systemSearch--------------->"+"%+v\n", systemSearch)
}

func TestTrimKeyWord(t *testing.T) {
	type args struct {
		keyWord string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equalf(t, tt.want, TrimKeyWord(tt.args.keyWord), "TrimKeyWord(%v)", tt.args.keyWord)
		})
	}
}
