package utils

import "math/rand"

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
