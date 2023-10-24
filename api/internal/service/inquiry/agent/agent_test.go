package agent

import (
	"fmt"
	"math/rand"
	"os"
	"testing"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestAgentGetLogs(t *testing.T) {

	start := time.Now().Unix() - 60*60*24*365
	req := view.ReqQuery{
		ST:   start,
		ET:   start + 60*60*24*50,
		Path: "./ego2.sys",
		// Dir:      "./ego2.sys",
		PageSize: 100,
		Query:    "comp=test9 and etc=test7",
	}

	logs := searchLogs(req)
	for _, log := range logs {
		fmt.Println(log)
	}

	fmt.Println("count: ", len(logs))
}

func searchLogs(query view.ReqQuery) []map[string]interface{} {
	agent := Agent{}
	resp, err := agent.GetLogs(query, 1)

	if err != nil {
		panic(err)
	}

	for _, log := range resp.Logs {
		fmt.Println(log)
	}

	fmt.Println("count: ", len(resp.Logs))
	return resp.Logs
}

func searchCharts(query view.ReqQuery) []*view.HighChart {
	agent := Agent{}
	_, query.Interval = agent.CalculateInterval(query.ET-query.ST, "")
	charts, _, err := agent.Chart(query)
	if err != nil {
		panic(err)
	}

	times := (query.ET - query.ST) / query.Interval
	var total uint64 = 0
	for _, chart := range charts {
		// fmt.Printf("=========== %d ============= \n", i)
		// fmt.Println("count: ", chart.Count)
		// fmt.Println("from: ", chart.From)
		// fmt.Println("to: ", chart.To)
		// fmt.Printf("=========== %d ============= \n", i)
		total += chart.Count
	}
	//
	fmt.Printf("res.len: %d, interval: %d times: %d, total: %d\n", len(charts), query.Interval, times, total)
	return charts
}

func TestAgentCharts(t *testing.T) {

	start := time.Now().Unix() - 60*60*24*365*5
	req := view.ReqQuery{
		ST:   start,
		ET:   start + 60*60*24*365*5,
		Path: "./ego2.sys",
		// Dir:      "/Users/jingyang/Desktop/project/isyanthony/clickvisual/api/internal/service/inquiry/agent/ego2.sys",
		PageSize: 499,
		Query:    "lv=info",
	}
	charts := searchCharts(req)
	for i, chart := range charts {
		fmt.Printf("=========== %d ============= \n", i)
		fmt.Println("count: ", chart.Count)
		fmt.Println("from: ", chart.From)
		fmt.Println("to: ", chart.To)
		fmt.Printf("=========== %d ============= \n", i)
	}

	fmt.Printf("res.len: %d, interval: %d \n", len(charts), req.Interval)
}

var (
	comp_words = []string{
		"Timeout exceeded",
		"Unexpected error occurred",
	}

	etc_words = []string{
		"server.port:8080",
		"db.host:localhost",
	}

	log_level = []string{
		"info",
		"error",
	}

	addrs = []string{
		"[Kafka:9092]",
		"[Elasticsearch:9093]",
	}

	log_template = `{"tss":%d,"lv":"%s","comp":"%s","etc":"%s","addr":"%s","ts":"%s"}`
)

/*
| 数据量  | 包含 Query  | charts 命中条数  | Logs 命中条数(MAX = 500)  | 分布程度(目标日志与非目标日志)      | Logs  | Charts |
| ------ | ---------- | --------------- | ------------------------ | ------------------------------ | ----- | ------ |
| 50w    | 是         | 25w             | 500                      | 均匀分布                        | 0.00s | 1.01s  |
| 50w    | 否         | 50w             | 500                      | 全部                           | 0.00s | 1.61s  |
| 100w   | 否         | 100w            | 500                      | 全部                           | 0.00s | 3.56s  |
| 100w   | 是         | 50w             | 500                      | 均匀分布                       | 0.01s | 2.03s  |
*/

type Category struct {
	count int
	addrs int
	etc   int
	comp  int
	lv    int
	now   int
}

type CasesFile struct {
	path          string
	st            int64
	et            int64
	logCategories []Category
	count         int64
}

func TestPrecisionLogData(t *testing.T) {
	file := files[5]
	logc := file.logCategories[0]
	logs := view.ReqQuery{
		ST:   file.st,
		ET:   file.et,
		Path: file.path,
		// Dir: "./logs",
		Query:    fmt.Sprintf("lv=%s and comp=%s and etc=%s", log_level[logc.lv], comp_words[logc.comp], etc_words[logc.etc]),
		PageSize: 499,
	}

	// t.Run("searchLogs", func(t *testing.T) {
	// 	searchLogs(logs)
	// })

	charts := logs
	t.Run("searchCharts", func(t *testing.T) {
		searchCharts(charts)
	})
}

var (
	files = []CasesFile{
		CasesFile{
			count: 50,
			path:  "./logs/50.sys",
			st:    1697356864,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 25,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 25,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 1000,
			path:  "./logs/1000.sys",
			st:    1697353324,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 500,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 500,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 100000,
			path:  "./10w.sys",
			st:    1696060924,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 50000,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 50000,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 500000,
			path:  "./logs/50w.sys",
			st:    1634284924,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 250000,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 250000,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 1000000,
			path:  "./logs/100w.sys",
			st:    1571212924,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 500000,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 500000,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 3580000,
			path:  "./logs/358w.sys",
			st:    1634184924,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 1280000,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 1280000,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 5000000,
			path:  "./logs/500w.sys",
			st:    1508140924,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 2500000,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 2500000,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
		{
			count: 10000000,
			path:  "./logs/1000w.sys",
			st:    1381996924,
			et:    1697356924,
			logCategories: []Category{
				{
					count: 1000000,
					addrs: 0,
					etc:   0,
					comp:  0,
					lv:    0,
				},
				{
					count: 1000000,
					addrs: 1,
					etc:   1,
					comp:  1,
					lv:    1,
				},
			},
		},
	}
)

func TestGenerateTestFile(t *testing.T) {
	writer, err := os.OpenFile("./358w.sys", os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		panic(err)
	}

	lines := files[5].count

	// 用例编号
	// casen := 5
	//
	// cases := []int64{
	// 	60,
	// 	60 * 60,
	// 	60 * 60 * 24 * 15,
	// 	60 * 60 * 24 * 365 * 2,
	// 	60 * 60 * 24 * 365 * 4,
	// 	60 * 60 * 24 * 365 * 6,
	// 	60 * 60 * 24 * 365 * 10,
	// 	60 * 60 * 24 * 365 * 20,
	// }

	now := int64(1697356924)
	interval := (files[5].et - files[5].st) / lines
	st := now - (files[5].et - files[5].st)

	cs := []Category{
		Category{
			count: int(lines / 2),
			addrs: 0,
			etc:   0,
			comp:  0,
			lv:    0,
		},

		Category{
			count: int(lines / 2),
			addrs: 1,
			etc:   1,
			comp:  1,
			lv:    1,
		},
	}

	fmt.Printf("now: %d, st: %d\n", now, st)
	record := st
	for i := 0; i < int(lines); i++ {
		pos := i % 2
		c := cs[pos]
		if c.now >= c.count {
			pos = (i + 1) % 2
			c = cs[pos]
		}
		cs[pos].now += 1
		logLevel, addr, comp, etc := c.lv, c.addrs, c.comp, c.etc
		record += rand.Int63n(interval)
		writer.WriteString(fmt.Sprintf(log_template+"\n", record, log_level[logLevel], comp_words[comp], etc_words[etc], addrs[addr], time.Unix(record, 0).Format("2006-01-02 15:04:05")))
	}
}

func TestMap(t *testing.T) {
	var mp map[int64]int64
	fmt.Println(mp[1])
}
