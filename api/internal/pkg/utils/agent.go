package utils

import (
	"strconv"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/elog"
)

func TimeParse(value string) time.Time {
	curTimeParser, err := time.Parse(time.DateTime, value)
	if err != nil {
		curTimeParser, err = time.Parse(time.RFC3339, value)
		if err != nil {
			// 可能为 1693573909,
			// 移除 ,
			value = strings.TrimSuffix(value, ",")
			// 将时间戳转换为 time 类型
			timestamp, _ := strconv.Atoi(value)
			if timestamp <= 0 {
				elog.Error("agent log parse timestamp error", elog.FieldErr(err))
				panic(err)
			}
			curTimeParser = time.Unix(int64(timestamp), 0)
		}
	}
	return curTimeParser
}

var filterKeys = []string{" stderr F ", " stdout F "}

// getFilterK8SContainerdWrapLog 过滤k8s containerd 包起来日志
// containerd 日志有一些数据前缀，导致不是json，需要过滤一些数据
// 2023-10-12T16:27:56.359684537+08:00 stderr F {"lv":"info","ts":1697099276,"caller":"egorm@v1.0.6/interceptor.go:125","msg":"access","lname":"ego.sys","comp":"component.egorm","compName":"mysql.file","addr":"mysql-master:3306","method":"gorm:row","name":"svc_file.","cost":0.223,"tid":"","event":"normal"}
func GetFilterK8SContainerdWrapLog(s string) string {
	for _, filter := range filterKeys {
		i := strings.Index(s, filter)
		if i != -1 {
			return s[i+len(filter):]
		}
	}
	return s
}

var indexFields = []string{`"ts":"`, `"time":"`, `"ts":`}

func IndexParse(line string) (string, int) {
	for _, field := range indexFields {
		res, index := Index(line, field)
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
