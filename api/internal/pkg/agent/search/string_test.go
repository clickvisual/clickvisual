package search

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_Index(t *testing.T) {
	str, pos := Index(`"ts":"2023-08-23 23:22:12" 12345`, `"ts":"`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	fmt.Printf("pos--------------->"+"%+v\n", pos)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_MidIndex(t *testing.T) {
	str, pos := Index(`"lv":"info","ts":"2023-08-23 23:22:12" 12345`, `"ts":"`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	fmt.Printf("pos--------------->"+"%+v\n", pos)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_getValue(t *testing.T) {
	str := getValue(`2023-08-23 23:22:12" 12345`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_getFilterK8SContainerdWrapLog(t *testing.T) {
	logs := getFilterK8SContainerdWrapLog(`2023-10-12T16:27:56.359684537+08:00 stderr F {"lv":"info","ts":1697099276,"caller":"egorm@v1.0.6/interceptor.go:125","msg":"access","lname":"ego.sys","comp":"component.egorm","compName":"mysql.file","addr":"mysql-master:3306","method":"gorm:row","name":"svc_file.","cost":0.223,"tid":"","event":"normal"}`)
	assert.Equal(t, `{"lv":"info","ts":1697099276,"caller":"egorm@v1.0.6/interceptor.go:125","msg":"access","lname":"ego.sys","comp":"component.egorm","compName":"mysql.file","addr":"mysql-master:3306","method":"gorm:row","name":"svc_file.","cost":0.223,"tid":"","event":"normal"}`, logs)
}
