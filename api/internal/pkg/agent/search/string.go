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
			key := strings.TrimSpace(info[0])
			val := strings.TrimSpace(info[1])
			val = strings.ReplaceAll(val, `'`, `"`)
			if tmp, err := strconv.Atoi(val); err == nil {
				// value is int
				word = KeySearch{
					Key:   key,
					Value: tmp,
					Type:  typeInt,
				}
			} else {
				// value is string
				word = KeySearch{
					Key:   key,
					Value: val,
					Type:  typeString,
				}
			}
		} else {
			word = KeySearch{
				Key:   "",
				Value: strings.TrimSpace(value),
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
	keyWord = strings.TrimSpace(keyWord)
	keyWord = strings.ReplaceAll(keyWord, "'", "")
	keyWord = strings.ReplaceAll(keyWord, "\"", "")
	keyWord = strings.ReplaceAll(keyWord, "`", "")
	return keyWord
}
