package benchmark

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
)

func TestCharts(t *testing.T) {
	fmt.Println("start test")
	file := casesFiles[0]
	req := search.Request{
		IsChartRequest: true,
		StartTime:      file.st,
		EndTime:        file.et,
		Path:           file.path,
		Limit:          500,
		KeyWord:        "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 206w logs
		// KeyWord:  "lv=info and key=service down and msg=cannot support xxx operation or xxxxxxx", // hit 60w logs
		Interval: search.ChartsIntervalConvert(file.et - file.st),
	}
	resp, _ := search.RunCharts(req)

	total := uint64(0)

	for _, chart := range resp.Data {
		total += chart.Count
	}

	fmt.Println("total: ", total, "expected: ", file.logCategories[0].count)
	assert.Equal(t, uint64(file.logCategories[0].count), total)
}
