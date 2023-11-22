package benchmark

import (
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
)

func BenchmarkCharts_500M_206w(b *testing.B) {
	// b.N = 10
	for n := 0; n < b.N; n++ {
		file := casesFiles[0]
		req := search.Request{
			// Debug:          true,
			IsChartRequest: true,
			StartTime:      file.st,
			EndTime:        file.et,
			Path:           file.path,
			KeyWord:        "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 206w logs
			Interval:       search.ChartsIntervalConvert(file.et - file.st),
		}
		_, err := search.RunCharts(req)
		if err != nil {
			panic(err)
		}
	}
}

func BenchmarkCharts_500M_50w(b *testing.B) {
	// b.N = 10
	for n := 0; n < b.N; n++ {
		file := casesFiles[0]
		req := search.Request{
			// Debug:          true,
			IsChartRequest: true,
			StartTime:      file.st,
			EndTime:        file.et,
			Path:           file.path,
			KeyWord:        "lv=info and key=service down and msg=cannot support xxx operation or xxxxxxx", // hit 60w logs
			Interval:       search.ChartsIntervalConvert(file.et - file.st),
		}
		_, err := search.RunCharts(req)
		if err != nil {
			panic(err)
		}
	}
}

func BenchmarkCharts_1GB_424w(b *testing.B) {
	// b.N = 10
	for n := 0; n < b.N; n++ {
		file := casesFiles[1]
		req := search.Request{
			IsChartRequest: true,
			StartTime:      file.st,
			EndTime:        file.et,
			Path:           file.path,
			KeyWord:        "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 424w logs
			Interval:       search.ChartsIntervalConvert(file.et - file.st),
		}
		_, err := search.RunCharts(req)
		if err != nil {
			panic(err)
		}
	}
}

func BenchmarkCharts_1GB_100w(b *testing.B) {
	for n := 0; n < b.N; n++ {
		file := casesFiles[1]
		req := search.Request{
			IsChartRequest: true,
			StartTime:      file.st,
			EndTime:        file.et,
			Path:           file.path,
			KeyWord:        "lv=info and key=service down and msg=cannot support xxx operation or xxxxxxx",
			Interval:       search.ChartsIntervalConvert(file.et - file.st),
		}
		_, err := search.RunCharts(req)
		if err != nil {
			panic(err)
		}
	}
}

//	func BenchmarkLogs_500M_206w(b *testing.B) {
//		b.N = 1
//		for n := 0; n < 1; n++ {
//			file := casesFiles[0]
//			req := search.Request{
//				StartTime: file.st,
//				EndTime:   file.et,
//				Path:      file.path,
//				Limit:     500,
//				KeyWord:   "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 206w logs
//				Interval:  search.ChartsIntervalConvert(file.st, file.et),
//			}
//			search.Run(req)
//		}
//	}
func BenchmarkLogs_500M_50w(b *testing.B) {
	for n := 0; n < b.N; n++ {
		file := casesFiles[0]
		req := search.Request{
			StartTime: file.st,
			EndTime:   file.et,
			Path:      file.path,
			Limit:     500,
			KeyWord:   "lv=info and key=service down and msg=cannot support xxx operation or xxxxxxx", // hit 60w logs
			Interval:  search.ChartsIntervalConvert(file.et - file.st),
		}
		_, err := search.Run(req)
		if err != nil {
			panic(err)
		}
		// fmt.Println("total:", len(resp.Data))
	}
}

// func BenchmarkLogs_1GB_424w(b *testing.B) {
// 	b.N = 10
// 	for n := 0; n < b.N; n++ {
// 		file := casesFiles[1]
// 		req := search.Request{
// 			Debug:     false,
// 			StartTime: file.st,
// 			EndTime:   file.et,
// 			Path:      file.path,
// 			Limit:     500,
// 			KeyWord:   "lv=error and key=service down and msg=invalid input, make sure what you input is right", // hit 424w logs
// 			Interval:  search.ChartsIntervalConvert(file.st, file.et),
// 		}
// 		search.Run(req)
// 	}
// }

func BenchmarkLogs_1GB_100w(b *testing.B) {
	for n := 0; n < b.N; n++ {
		file := casesFiles[1]
		req := search.Request{
			StartTime: file.st,
			EndTime:   file.et,
			Path:      file.path,
			Limit:     500,
			KeyWord:   "lv=info and key=service down and msg=cannot support xxx operation or xxxxxxx",

			Interval: search.ChartsIntervalConvert(file.et - file.st),
		}
		_, _ = search.Run(req)
	}
}
