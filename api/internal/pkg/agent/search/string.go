package search

import (
	"strings"
)

var indexField = []string{"ts", "time"}

func IndexParse(line string) (string, int) {
	for _, field := range indexField {
		res, index := Index(line, `"`+field+`":"`)
		if index != -1 {
			return res, index
		}
	}
	return "", -1
}

// Index 根据数据匹配，获得后面的时间数据，"ts":"(.*)"
// "ts":"
func Index(s, substr string) (string, int) {
	subStrLen := len(substr)
	allStrLen := len(s)
	i := 0
	for i < allStrLen-subStrLen {
		if s[i:i+subStrLen] == substr {
			return getValue(s[i+subStrLen:]), i
		}
		i++
	}
	return "", -1
}

// getValue 获取内容
// 根据上文key，得到后面s的内容
// 找到第一个引号
//
//	todo 注意这个有转义，后续实现
func getValue(s string) string {
	allStrLen := len(s)
	i := 0
	// 2023-01-22 xxxx"
	for i < allStrLen {
		if s[i] == '"' {
			break
		}
		i++
	}
	return s[0:i]
}

// getFilterK8SContainerdWrapLog 过滤k8s containerd 包起来日志
// containerd 日志有一些数据前缀，导致不是json，需要过滤一些数据
// 2023-10-12T16:27:56.359684537+08:00 stderr F {"lv":"info","ts":1697099276,"caller":"egorm@v1.0.6/interceptor.go:125","msg":"access","lname":"ego.sys","comp":"component.egorm","compName":"mysql.file","addr":"mysql-master:3306","method":"gorm:row","name":"svc_file.","cost":0.223,"tid":"","event":"normal"}
func getFilterK8SContainerdWrapLog(s string) string {
	filter := " stderr F "
	i := strings.Index(s, filter)
	return s[i+len(filter):]
}
