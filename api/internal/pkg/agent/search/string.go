package search

import (
	"strconv"
	"strings"
)

func Keyword2Array(keyword string, isSkip bool) []KeySearch {
	if keyword == "" {
		return make([]KeySearch, 0)
	}
	words := make([]KeySearch, 0)
	arrs := strings.Split(keyword, "and")
	for _, value := range arrs {
		word := KeySearch{}
		if strings.Contains(value, "=") {
			info := strings.Split(value, "=")
			v := strings.Trim(info[1], " ")
			v = strings.ReplaceAll(v, `'`, `"`)
			if tmp, err := strconv.Atoi(v); err == nil {
				// value is int
				word = KeySearch{
					Key:   strings.Trim(info[0], " "),
					Value: tmp,
					Type:  typeInt,
				}
			} else {
				// value is string
				word = KeySearch{
					Key:   strings.Trim(info[0], " "),
					Value: v,
					Type:  typeString,
				}
			}
		} else {
			word = KeySearch{
				Key:   "",
				Value: strings.Trim(value, " "),
				Type:  typeString,
			}
		}
		if isSkip {
			if _, ok := SkipKeys[word.Key]; ok {
				continue
			}
		}
		words = append(words, word)
	}
	return words
}

func TrimKeyWord(keyWord string) string {
	if keyWord == "" {
		return ""
	}
	keyWord = strings.ReplaceAll(keyWord, "'", "")
	keyWord = strings.ReplaceAll(keyWord, "\"", "")
	keyWord = strings.ReplaceAll(keyWord, "`", "")
	return keyWord
}
