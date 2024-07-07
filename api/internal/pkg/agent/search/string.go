package search

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/samber/lo"
)

func Keyword2Array(keyword string) ([]CustomSearch, []SystemSearch, error) {
	if keyword == "" {
		return make([]CustomSearch, 0), make([]SystemSearch, 0), nil
	}
	words := make([]CustomSearch, 0)
	systemSearchArr := make([]SystemSearch, 0)

	arrs := strings.Split(keyword, "and")
	for _, value := range arrs {
		isSystemSearch := false
		word := CustomSearch{}
		systemSearch := SystemSearch{}
		newValue := strings.TrimSpace(value)
		i := 0
		switch newValue[i] {
		// key的开始状态
		case '`':
			i++
			for ; i < len(newValue); i++ {
				// 说明结束
				if newValue[i] == '`' {
					if lo.Contains(SystemKeyArr, newValue[1:i]) {
						isSystemSearch = true
						systemSearch.Key = newValue[1:i]
					} else {
						word.Key = newValue[1:i]
					}
					i++
					break
				}
			}
			// 认为是模糊匹配
		default:
			word.Key = newValue[i:]
		}
		flagOp := false
		var operate SearchOperate
		// 操作符
		for ; i < len(newValue); i++ {
			if flagOp {
				break
			}
			if newValue[i] == ' ' {
				continue
			}
			switch newValue[i] {
			case '=':
				word.Operate = KeySearchOperateEqual
				operate = KeySearchOperateEqual
				flagOp = true
			case '>':
				word.Operate = KeySearchOperateGT
				operate = KeySearchOperateGT
				flagOp = true
			case '<':
				word.Operate = KeySearchOperateLT
				operate = KeySearchOperateLT
				flagOp = true
			case 'l':
				// todo 这里可能会panic
				if newValue[i:i+4] == "like" {
					operate = KeySearchOperateLike
					i = i + 3
					flagOp = true
				}
			case 'L':
				// todo 这里可能会panic
				if newValue[i:i+4] == "LIKE" {
					operate = KeySearchOperateLike
					i = i + 3
					flagOp = true
				}
			default:
				return nil, nil, fmt.Errorf("operate not valid, %v", newValue[i])
			}

		}

		var err error
		flagValue := false
		// value数据
		for ; i < len(newValue); i++ {
			if flagValue {
				break
			}
			if newValue[i] == ' ' {
				continue
			}
			firstVal := newValue[i]
			switch firstVal {
			// 可能是字符串或者数字
			case '\'':
				i++
				startI := i
				for ; i < len(newValue); i++ {
					// 说明结束
					if newValue[i] == '\'' {
						flagValue = true
						val := newValue[startI:i]
						switch operate {
						case KeySearchOperateEqual:
							// 系统模式只有字符串类型
							if isSystemSearch {
								systemSearch.ValueString = val
							} else {
								word.ValueInt64, err = strconv.ParseInt(val, 10, 10)
								if err != nil {
									word.ValueFloat64, err = strconv.ParseFloat(val, 10)
									if err != nil {
										word.ValueString = val
										word.Type = KeySearchTypeString
									} else {
										word.Type = KeySearchTypeFloat64
									}
								} else {
									word.Type = KeySearchTypeFloat64
								}
							}
							// 必须数字
						case KeySearchOperateGT:
							// 必须数字
							if strings.Contains(val, ".") {
								word.ValueFloat64, err = strconv.ParseFloat(val, 10)
								word.Type = KeySearchTypeFloat64
							} else {
								word.ValueInt64, err = strconv.ParseInt(val, 10, 10)
								word.Type = KeySearchTypeInt64
							}
							if err != nil {
								return nil, nil, fmt.Errorf("KeySearchOperateGT to number fail, err: %w, val: %v", err, val)
							}
						case KeySearchOperateLT:
							if strings.Contains(val, ".") {
								word.ValueFloat64, err = strconv.ParseFloat(val, 10)
								word.Type = KeySearchTypeFloat64
							} else {
								word.ValueInt64, err = strconv.ParseInt(val, 10, 10)
								word.Type = KeySearchTypeInt64
							}
							if err != nil {
								return nil, nil, fmt.Errorf("KeySearchOperateGT to number fail, err: %w, val: %v", err, val)
							}
						case KeySearchOperateLike:
							if isSystemSearch {
								systemSearch.ValueString = val
							}
						}

					}
				}

				// 必须是数字，否则报错
			default:
				val := newValue[i:]
				// 是数字
				if firstVal >= 48 && firstVal <= 57 {
					// 必须数字
					if strings.Contains(val, ".") {
						word.ValueFloat64, err = strconv.ParseFloat(val, 10)
						word.Type = KeySearchTypeFloat64
					} else {
						word.ValueInt64, err = strconv.ParseInt(val, 10, 10)
						word.Type = KeySearchTypeInt64
					}
					if err != nil {
						return nil, nil, fmt.Errorf("SearchOperate to number fail, err: %w, val: %v", err, val)
					}
					flagValue = true
				} else {
					return nil, nil, fmt.Errorf("CustomSearch Val Default fail, val: %v", val)
				}

			}
		}

		if isSystemSearch {
			systemSearchArr = append(systemSearchArr, systemSearch)
		} else {
			words = append(words, word)
		}
	}

	for _, systemValue := range systemSearchArr {
		if systemValue.Key == InnerRawLog {
			words = append(words, CustomSearch{
				Key:         "",
				ValueString: strings.Trim(systemValue.ValueString, "%"),
				Operate:     KeySearchOperateEqual,
				Type:        KeySearchTypeString,
			})
		}
	}

	return words, systemSearchArr, nil
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
