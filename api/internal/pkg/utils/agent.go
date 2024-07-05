package utils

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

//func TimeParse(value string) *time.Time {
//	curTimeParser, err := time.ParseInLocation(time.DateTime, value, time.Local)
//	if err != nil {
//		curTimeParser, err = time.ParseInLocation(time.RFC3339, value, time.Local)
//		if err != nil {
//			// 可能为 1693573909,
//			// 可能为 1693573909.123456,
//			// 移除 ,
//			value = strings.TrimSuffix(value, ",")
//			// 可能为 1693573909.123456,
//			if strings.Contains(value, ".") {
//				value = strings.Split(value, ".")[0]
//			}
//			// 将时间戳转换为 time 类型
//			timestamp, _ := strconv.Atoi(value)
//			if timestamp <= 0 {
//				return nil
//			}
//			curTimeParser = time.Unix(int64(timestamp), 0)
//		}
//	}
//	return &curTimeParser
//}

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

var indexFields = []string{`"ts":`, `"time":`}

func IndexParseTime(line string) (int64, int) {
	for _, field := range indexFields {
		res, index := IndexTime(line, field)
		if index != -1 {
			return res, index
		}
	}
	return 0, -1
}

// IndexTime 根据数据匹配，获得后面的时间数据，"ts":"(.*)"
// "ts":"(.*)",
// "ts":(.*),
func IndexTime(s, substr string) (int64, int) {
	subStrLen := len(substr)
	allStrLen := len(s)
	i := 0
	for i < allStrLen-subStrLen {
		if s[i:i+subStrLen] == substr {
			info, err := getTimeValue(s[i+subStrLen:])
			if err != nil {
				return 0, -1
			}
			return info, i
		}
		i++
	}
	return 0, -1
}

// getTimeValue 获取内容
// 根据上文key，得到后面s的内容
// 找到第一个引号
// 如果时间是字符串，"2023-01-22 xxxx",
// 如果时间是数字, 1720147633.7225456,
// 如果时间是数字, 1720147633,
// todo 注意这个有转义，后续实现
func getTimeValue(s string) (int64, error) {
	// 第一个字符类型
	// 如果是"，那么就是字符串
	// 如果是数字，那么就是数字
	// 如果都不是说明数据异常
	if s[0] == '"' {
		// 如果是字符串，结尾，是找到"
		allStrLen := len(s)
		// 去掉第一个字符
		i := 1
		// 2023-01-22 xxxx"
		for i < allStrLen {
			if s[i] == '"' {
				break
			}
			i++
		}
		// 去掉第一个字符
		return timeParseInt64(s[1:i])
		// 在48，57之间说明是0～9数字
	} else if s[0] >= 48 && s[0] <= 57 {
		// 如果是数字，结尾，是找到,
		allStrLen := len(s)
		i := 0
		// 2023-01-22 xxxx"
		for i < allStrLen {
			// 小数数字
			if s[i] == '.' {
				break
			}
			if s[i] == ',' {
				break
			}
			i++
		}
		num, err := strconv.Atoi(s[0:i])
		if err != nil {
			return 0, fmt.Errorf("strconv fail, origin: %v, err: %w", s[0:i], err)
		}
		return int64(num), nil
	} else {
		return 0, fmt.Errorf("first rune is not valid, rune is %v", s[0])
	}

}

func timeParseInt64(value string) (int64, error) {
	curTimeParser, err := time.ParseInLocation(time.DateTime, value, time.Local)
	if err != nil {
		curTimeParser, err = time.ParseInLocation(time.RFC3339, value, time.Local)
		if err != nil {
			return 0, fmt.Errorf("time cant parser, origin: %v, err: %w", value, err)
		}
	}
	return curTimeParser.Unix(), nil
}
