package service

import (
	"strings"
)

func arrFilter(source, target []string) []string {
	res := make([]string, 0)
	filter := make(map[string]interface{})
	for _, v := range source {
		filter[v] = struct{}{}
	}
	for _, v := range target {
		filter[v] = struct{}{}
	}
	for k := range filter {
		res = append(res, k)
	}
	return res
}

func databaseCutting(input []string) (output []string) {
	output = make([]string, 0)
	for _, row := range input {
		rowArr := strings.Split(row, ".")
		if len(rowArr) != 2 {
			continue
		}
		output = append(output, rowArr[1])
	}
	return
}
