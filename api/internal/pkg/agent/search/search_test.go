package search

import (
	"fmt"
	"testing"
)

func TestGoroutineCalc(t *testing.T) {
	// 1696070784
	// 60 * 60 * 24 * 365 * 2
	// st, et := int64(1634184933), int64(1662832024) // 358
	st, et := int64(1381996928), int64(1521997784) // 1000
	req := Request{
		// Debug:          true,
		IsChartRequest: true,
		StartTime:      st,
		EndTime:        et,
		Path:           "./1000w.sys",
		Limit:          499,
		// Dir: "./logs",
		KeyWord:  "lv=info and comp=Timeout exceeded",
		Interval: ChartsIntervalConvert(et - st),
	}
	resp, _ := RunCharts(req)

	// ./358w.sys goroutine -> lines: 875983
	// ./358w.sys goroutine -> lines: 875983

	// 1669596907
	//  1669327789

	fmt.Println("len: ", len(resp.Data))
	// total := int64(0)
	// for i, chart := range resp {
	// 	fmt.Printf("========= %d =========\n", i)
	// 	fmt.Printf("count: %d\n", chart.Count)
	// 	fmt.Printf("from:  %d\n", chart.From)
	// 	fmt.Printf("to:    %d\n", chart.To)
	// 	fmt.Printf("========= %d =========\n", i)
	// 	total += int64(chart.Count)
	// }
	// // lastNow :=
	// fmt.Println("total : ", total)
	// fmt.Println(len(charts))

	// fmt.Println(len(resp.Data))
	//
	// for i, data := range resp.Data {
	// 	fmt.Printf("========= %d =========\n", i)
	// 	fmt.Printf("count: %s\n", data.Line)
	// 	fmt.Printf("========= %d =========\n", i)
	// }
	fmt.Printf("st: %d, et: %d, interval: %d, times: %d\n", req.StartTime, req.EndTime, req.Interval, (req.EndTime-req.StartTime)/req.Interval)
}
