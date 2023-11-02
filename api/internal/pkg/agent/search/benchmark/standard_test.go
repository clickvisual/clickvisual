package benchmark

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
)

/*
standard unit test for agent search pkg
*/

func TestLogsStandard(t *testing.T) {
	caseLen := len(casesFiles)
	a := assert.New(t)
	for i := 0; i < caseLen; i++ {
		file := casesFiles[i]
		if file.skip {
			continue
		}
		categoriesLen := len(file.logCategories)
		for j := 0; j < categoriesLen; j++ {
			log := file.logCategories[j]
			req := search.Request{
				StartTime: file.st,
				EndTime:   file.et,
				Path:      file.path,
				Limit:     500,
				KeyWord:   log.filter,
				Interval:  search.ChartsIntervalConvert(file.et - file.st),
			}
			resp, err := search.Run(req)
			a.NoError(err, "logs search error -> ", file.path, log.content, log.count)
			a.Equal(min(log.count, 500), int64(len(resp.Data)), "logs count error")
		}
	}
}

func TestChartsStandard(t *testing.T) {
	caseLen := len(casesFiles)
	a := assert.New(t)
	for i := 0; i < caseLen; i++ {
		file := casesFiles[i]
		if file.skip {
			continue
		}
		categoriesLen := len(file.logCategories)
		for j := 0; j < categoriesLen; j++ {
			log := file.logCategories[i]
			req := search.Request{
				IsChartRequest: true,
				StartTime:      file.st,
				EndTime:        file.et,
				Path:           file.path,
				KeyWord:        log.filter,
				Interval:       search.ChartsIntervalConvert(file.et - file.st),
			}
			resp, err := search.RunCharts(req)
			a.NoError(err, "charts search error -> ", file.path, log.filter, log.count)
			total := int64(0)
			for _, v := range resp.Data {
				total += v
			}
			a.Equal(log.count, total, "charts count error", file.path, log.filter, log.count)
		}
	}
}

func TestSingleCase(t *testing.T) {
	a := assert.New(t)
	file := casesFiles[1]
	log := file.logCategories[1]
	req := search.Request{
		IsChartRequest: true,
		StartTime:      file.st,
		EndTime:        file.et,
		Path:           file.path,
		KeyWord:        log.filter, // hit 60w logs
		Interval:       search.ChartsIntervalConvert(file.et - file.st),
	}
	resp, err := search.RunCharts(req)
	a.NoError(err, "charts search error -> ", file.path, log.filter, log.count)
	total := int64(0)
	for k, v := range resp.Data {
		total += v
		fmt.Printf("key: %d, value: %d\n", k, v)
	}
	fmt.Printf("expected :%d, actual: %d", log.count, total)
}

func TestLogsSingleCase(t *testing.T) {
	a := assert.New(t)
	file := casesFiles[2]
	log := file.logCategories[1]
	req := search.Request{
		StartTime: file.st,
		EndTime:   file.et,
		Path:      file.path,
		Limit:     500,
		// KeyWord:        log.filter, // hit 60w logs
	}
	resp, err := search.Run(req)
	a.NoError(err, "charts search error -> ", file.path, log.filter, log.count)
	fmt.Println(len(resp.Data))
}

func TestDevEnvFile(t *testing.T) {
	a := assert.New(t)
	file := CasesFile{
		// path:     "./app-api.log",
		// st:       1698716774,
		// et:       1698718344,
		path:     "./kube.sys",
		st:       1698716774,
		et:       1698718344,
		interval: search.ChartsIntervalConvert(1698718344 - 1698716774),
		logCategories: []Category{
			{
				content: "",
				count:   123123,
				filter:  "",
			},
		},
	}
	log := file.logCategories[0]
	req := search.Request{
		IsChartRequest: true,
		StartTime:      file.st,
		EndTime:        file.et,
		// KeyWord:        "msg=do proxy",
		Path:     file.path,
		Interval: file.interval,
	}
	resp, err := search.RunCharts(req)
	a.NoError(err, "charts search error -> ", file.path, log.filter, log.count)
	total := int64(0)
	for k, v := range resp.Data {
		total += v
		fmt.Printf("key: %d, value: %d\n", k, v)
	}
	fmt.Printf("expected :%d, actual: %d\n", log.count, total)

	req.IsChartRequest = false
	req.Limit = 500
	r, err := search.Run(req)
	a.NoError(err, "logs search error -> ", file.path, log.filter, log.count)
	fmt.Println("logs: ", len(r.Data))
	for i, v := range r.Data {
		fmt.Printf("%d -> %s\n", i, v.Line)
	}
}
