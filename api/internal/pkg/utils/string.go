package utils

import (
	"fmt"
	"math/rand"
	"time"
)

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func RandomString(length int) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// PhoneSensitiveInfoRemove ...
func PhoneSensitiveInfoRemove(phone string) string {
	if len(phone) != 11 {
		return phone
	}
	return phone[0:3] + "****" + phone[7:11]
}

func SundaySearch(s, p string, keys map[uint8]int) int {
	plen := len(p)
	if plen == 0 {
		return 0
	}

	slen := len(s)
	if slen == 0 && plen != 0 {
		return -1
	}

	sIndex := 0
	pIndex := 0
	space := 0

	for sIndex < slen {
		if s[sIndex] == p[pIndex] {
			sIndex++
			pIndex++
			if pIndex == plen {
				return sIndex - pIndex
			}
		} else {
			pIndex = 0
			if space+plen < slen {
				pos := -1
				if v, ok := keys[s[space+plen]]; ok {
					pos = v
				}
				// 寻找下个模式串匹配的初始位置
				space += len(p) - pos
			} else { // 位移与模式串的长度和超出原字符串的长度
				return -1
			}
			sIndex = space
		}
	}
	return -1
}

// TimeToPrecisionString formats a time to a string with specified precision
// precision:
//
//	"milli" -> milliseconds (10^-3)
//	"micro" -> microseconds (10^-6)
//	"nano"  -> nanoseconds  (10^-9)
func TimeToPrecisionString(t time.Time, precision string) string {
	switch precision {
	case "milli":
		return formatWithPrecision(t.UnixMilli(), 1e3, 3)
	case "micro":
		return formatWithPrecision(t.UnixMicro(), 1e6, 6)
	case "nano":
		return formatWithPrecision(t.UnixNano(), 1e9, 9)
	default:
		return ""
	}
}

// formatWithPrecision formats timestamp with given precision
// timestamp: Unix timestamp with specific precision
// divisor: divisor to get seconds part
// width: number of digits for decimal part
func formatWithPrecision(timestamp int64, divisor int64, width int) string {
	seconds := timestamp / divisor
	fraction := timestamp % divisor
	return fmt.Sprintf("%d.%0*d", seconds, width, fraction)
}
