package utils

import (
	"regexp"
	"strings"
)

var regSelectFields = regexp.MustCompile(`^(SELECT|select)([\S\s]+)(FROM|from)`)
var regAlias = regexp.MustCompile(`(?i)\s+as\s+(.+)$`)

func GenerateFieldOrderRules(sql string) ([]string, bool) {
	regRes := regSelectFields.FindStringSubmatch(sql)
	if len(regRes) == 4 {
		res := make([]string, 0)
		fields, ok := splitSelectFields(strings.TrimSpace(regRes[2]))
		if !ok {
			return nil, false
		}
		for _, tmp := range fields {
			tmp = strings.TrimSpace(tmp)
			if tmp == "" {
				continue
			}
			if asPos := regAlias.FindStringSubmatchIndex(tmp); asPos != nil {
				alias := strings.TrimSpace(tmp[asPos[2]:asPos[3]])
				if alias == "" {
					return nil, false
				}
				res = append(res, alias)
				continue
			}
			res = append(res, tmp)
		}
		return res, true
	}
	return nil, false
}

func splitSelectFields(selectFields string) ([]string, bool) {
	res := make([]string, 0)
	var current strings.Builder
	depth := 0
	inSingleQuote := false
	inDoubleQuote := false
	inBacktick := false
	escape := false

	for _, ch := range selectFields {
		if escape {
			current.WriteRune(ch)
			escape = false
			continue
		}
		if (inSingleQuote || inDoubleQuote) && ch == '\\' {
			current.WriteRune(ch)
			escape = true
			continue
		}
		switch ch {
		case '\'':
			if !inDoubleQuote && !inBacktick {
				inSingleQuote = !inSingleQuote
			}
			current.WriteRune(ch)
		case '"':
			if !inSingleQuote && !inBacktick {
				inDoubleQuote = !inDoubleQuote
			}
			current.WriteRune(ch)
		case '`':
			if !inSingleQuote && !inDoubleQuote {
				inBacktick = !inBacktick
			}
			current.WriteRune(ch)
		case '(':
			if !inSingleQuote && !inDoubleQuote && !inBacktick {
				depth++
			}
			current.WriteRune(ch)
		case ')':
			if !inSingleQuote && !inDoubleQuote && !inBacktick {
				depth--
				if depth < 0 {
					return nil, false
				}
			}
			current.WriteRune(ch)
		case ',':
			if !inSingleQuote && !inDoubleQuote && !inBacktick && depth == 0 {
				res = append(res, current.String())
				current.Reset()
				continue
			}
			current.WriteRune(ch)
		default:
			current.WriteRune(ch)
		}
	}

	if inSingleQuote || inDoubleQuote || inBacktick || depth != 0 {
		return nil, false
	}
	res = append(res, current.String())
	return res, true
}
