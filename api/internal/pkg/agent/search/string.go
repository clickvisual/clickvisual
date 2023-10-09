package search

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

func StringPointer(s string) *string {
	return &s
}

func Int64Pointer(s int64) *int64 {
	return &s
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
