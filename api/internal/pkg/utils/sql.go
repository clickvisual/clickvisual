package utils

import (
	"regexp"
	"strings"
)

var regSelectFields = regexp.MustCompile(`^(SELECT|select)([\S\s]+)(FROM|from)`)

func isSQLSpace(char byte) bool {
	return char == ' ' || char == '\t' || char == '\n' || char == '\r'
}

func topLevelAliasEnd(field string) int {
	depth := 0
	var quote byte
	aliasEnd := -1
	for i := 0; i < len(field); i++ {
		char := field[i]
		if quote != 0 {
			if char == quote {
				if i+1 < len(field) && field[i+1] == quote {
					i++
					continue
				}
				quote = 0
			}
			continue
		}
		switch char {
		case '\'', '"', '`':
			quote = char
		case '(':
			depth++
		case ')':
			if depth > 0 {
				depth--
			}
		default:
			if depth == 0 && i > 0 && i+2 < len(field) &&
				strings.EqualFold(field[i:i+2], "as") &&
				isSQLSpace(field[i-1]) && isSQLSpace(field[i+2]) {
				aliasEnd = i + 3
				i++
			}
		}
	}
	return aliasEnd
}

func GenerateFieldOrderRules(sql string) ([]string, bool) {
	regRes := regSelectFields.FindStringSubmatch(sql)
	if len(regRes) == 4 {
		res := make([]string, 0)
		for _, tmp := range strings.Split(strings.TrimSpace(regRes[2]), ",") {
			if aliasEnd := topLevelAliasEnd(tmp); aliasEnd >= 0 {
				res = append(res, strings.TrimSpace(tmp[aliasEnd:]))
			} else {
				res = append(res, strings.TrimSpace(tmp))
			}
		}
		return res, true
	}
	return nil, false
}
