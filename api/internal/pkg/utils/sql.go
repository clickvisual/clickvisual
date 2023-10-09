package utils

import (
	"regexp"
	"strings"
)

var regSelectFields = regexp.MustCompile(`^(SELECT|select)([\S\s]+)(FROM|from)`)

func GenerateFieldOrderRules(sql string) ([]string, bool) {
	regRes := regSelectFields.FindStringSubmatch(sql)
	if len(regRes) == 4 {
		res := make([]string, 0)
		for _, tmp := range strings.Split(strings.TrimSpace(regRes[2]), ",") {
			if strings.Contains(tmp, " as ") {
				asArr := strings.Split(tmp, " as ")
				if len(asArr) != 2 {
					return nil, false
				}
				res = append(res, strings.TrimSpace(asArr[1]))
			} else {
				res = append(res, strings.TrimSpace(tmp))
			}
		}
		return res, true
	}
	return nil, false
}
