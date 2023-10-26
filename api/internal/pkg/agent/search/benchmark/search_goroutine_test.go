package benchmark

import (
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
)

func BenchmarkSearchLogs_buffer_3(b *testing.B) {
	file := casesFiles[1]
	b.N = 10
	for i := 0; i < b.N; i++ {
		req := search.Request{
			// IsChartRequest: true,
			StartTime: file.st,
			EndTime:   file.et,
			Path:      file.path,
			Limit:     500,
			// KeyWord:   "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 206w logs
			KeyWord:  "lv=info and key=service down and msg=cannot support xxx operation or xxxxxxx", // hit 60w logs
			Interval: search.ChartsIntervalConvert(file.et - file.st),
		}
		search.Run(req)
	}
}

func BenchmarkSearchLogs_buffer_2(b *testing.B) {
	file := casesFiles[1]
	b.N = 10
	for i := 0; i < b.N; i++ {
		req := search.Request{
			// IsChartRequest: true,
			StartTime: file.st,
			EndTime:   file.et,
			Path:      file.path,
			Limit:     500,
			// KeyWord:   "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 206w logs
			KeyWord:  "lv=info and msg=cannot support xxx operation or xxxxxxx", // hit 60w logs
			Interval: search.ChartsIntervalConvert(file.et - file.st),
		}
		search.Run(req)
	}
}

func BenchmarkSearchLogs_buffer_0(b *testing.B) {
	file := casesFiles[1]
	req := search.Request{
		// IsChartRequest: true,
		StartTime: file.st,
		EndTime:   file.et,
		Path:      file.path,
		Limit:     500,
		// KeyWord:   "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 206w logs
		KeyWord:  "", // hit 60w logs
		Interval: search.ChartsIntervalConvert(file.et - file.st),
	}
	search.Run(req)
}
