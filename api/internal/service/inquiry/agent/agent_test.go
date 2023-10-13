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

	// for _, log := range resp.Logs {
	// 	fmt.Println(log)
	// }
	//
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
	for i, chart := range charts {
		fmt.Printf("=========== %d ============= \n", i)
		fmt.Println("count: ", chart.Count)
		fmt.Println("from: ", chart.From)
		fmt.Println("to: ", chart.To)
		fmt.Printf("=========== %d ============= \n", i)
		total += chart.Count
	}

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
	n          = 10
	comp_words = []string{
		"Invalid input",
		"Unauthorized access",
		"File not found",
		"Database connection error",
		"Permission denied",
		"Duplicate entry",
		"Invalid credentials",
		"Internal server error",
		"Timeout exceeded",
		"Unexpected error occurred",
	}

	etc_words = []string{
		"server.port:8080",
		"db.host:localhost",
		"db.port:3306",
		"db.username:root",
		"db.password:secret",
		"logging.level:info",
		"cache.enabled:true",
		"cache.maxSize:1000",
		"api.key:your-api-key",
		"timeout.seconds:30",
	}

	log_level = []string{
		"info",
		"error",
		"warn",
		"debug",
	}

	addrs = []string{
		"[Kafka:9092]",
		"[Elasticsearch:9093]",
		"[Mongodb:9094]",
		"[Mysql:9095]",
		"[PostgreSQL:9096]",
		"[Redis:9097]",
		"[ClickHouse:9098]",
		"[Nacos:9099]",
		"[Consul:9099]",
		"[Apollo:9099]",
	}

	log_template = `{"tss":%d,"lv":"%s","comp":"%s","etc":"%s","addr":"%s","ts":"%s"}`
)

func TestRandomLogsSearch(t *testing.T) {
	writer, err := os.OpenFile("./ego2.sys", os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		panic(err)
	}

	now := time.Now().Unix()
	record := now - 60*60*24*365*5
	lines := 100_0000
	for i := 0; i < lines; i++ {
		record = record + int64(rand.Intn(5))
		writer.WriteString(fmt.Sprintf(log_template+"\n", log_level[rand.Intn(4)], comp_words[rand.Intn(n)], etc_words[rand.Intn(n)], addrs[rand.Intn(n)], time.UnixMilli(record*1000).Format("2006-01-02 15:04:05")))
	}

	logs := view.ReqQuery{
		ST:       now - 60*60*24*365*5,
		ET:       now,
		Path:     "./ego2.sys",
		Query:    "lv=info",
		PageSize: 400,
	}
	t.Run("searchLogs", func(t *testing.T) {
		fmt.Println("### searchLogs ###")
		searchLogs(logs)
	})

	charts := logs
	t.Run("searchCharts", func(t *testing.T) {
		fmt.Println("### searchCharts  ###")
		searchCharts(charts)
	})
	err = os.Remove("./ego2.sys")
}

/*
| 数据量  | 包含 Query  | charts 命中条数  | Logs 命中条数(MAX = 500)  | 分布程度(目标日志与非目标日志)      | Logs  | Charts |
| ------ | ---------- | --------------- | ------------------------ | ------------------------------ | ----- | ------ |
| 50w    | 是         | 25w             | 500                      | 均匀分布                        | 0.00s | 1.01s  |
| 50w    | 否         | 50w             | 500                      | 全部                           | 0.00s | 1.61s  |
| 100w   | 否         | 100w            | 500                      | 全部                           | 0.00s | 3.56s  |
| 100w   | 是         | 50w             | 500                      | 均匀分布                       | 0.01s | 2.03s  |
*/
func TestPrecisionLogData(t *testing.T) {
	writer, err := os.OpenFile("./ego2.sys", os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		panic(err)
	}

	type Category struct {
		count int
		addrs int
		etc   int
		comp  int
		lv    int
		now   int
	}

	lines := 100
	cs := []Category{
		Category{
			count: lines / 2,
			addrs: 2,
			etc:   5,
			comp:  7,
			lv:    3,
		},

		Category{
			count: lines / 2,
			addrs: 5,
			etc:   2,
			comp:  9,
			lv:    1,
		},
	}

	now := time.Now().Unix()
	st := now - int64(60*60)
	record := st

	for i := 0; i < lines; i++ {
		pos := i % 2
		c := cs[pos]
		if c.now >= c.count {
			pos = (i + 1) % 2
			c = cs[pos]
		}
		cs[pos].now += 1
		logLevel, addr, comp, etc := c.lv, c.addrs, c.comp, c.etc
		record += 36
		writer.WriteString(fmt.Sprintf(log_template+"\n", record, log_level[logLevel], comp_words[comp], etc_words[etc], addrs[addr], time.Unix(record, 0).Format("2006-01-02 15:04:05")))
	}
	fmt.Printf("c[0].count : %d, c[1].count : %d\n", cs[0].now, cs[1].now)

	logs := view.ReqQuery{
		ST:       st,
		ET:       now - int64(60*30),
		Path:     "./ego2.sys",
		Query:    fmt.Sprintf("lv=%s and comp=%s and etc=%s", log_level[cs[0].lv], comp_words[cs[0].comp], etc_words[cs[0].etc]),
		PageSize: 499,
	}

	t.Run("searchLogs", func(t *testing.T) {
		searchLogs(logs)
	})

	charts := logs
	t.Run("searchCharts", func(t *testing.T) {
		searchCharts(charts)
	})
	// err = os.Remove("./ego2.sys")
}

func TestMap(t *testing.T) {
	var mp = make(map[string]int)
	fmt.Println(mp["123"])
}
