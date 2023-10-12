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
		ST: start,
		ET: start + 60*60*24*50,
		// Path:     "/Users/duminxiang/cosmos/go/src/github.com/clickvisual/clickvisual/logs/ego.sys",
		Dir:      "/Users/jingyang/Desktop/project/isyanthony/clickvisual/api/internal/service/inquiry/agent/ego2.sys",
		PageSize: 100,
		Query:    "comp=test9 and etc=test7",
	}

	agent := Agent{}
	resp, err := agent.GetLogs(req, 1)
	if err != nil {
		panic(err)
	}
	for _, log := range resp.Logs {
		fmt.Println(log)
	}

	fmt.Println("count: ", len(resp.Logs))
}

func TestAgentCharts(t *testing.T) {

	start := time.Now().Unix() - 60*60*24*365*5
	req := view.ReqQuery{
		ST:   start,
		ET:   start + 60*60*24*365*5,
		Path: "/Users/jingyang/Desktop/project/isyanthony/clickvisual/api/internal/service/inquiry/agent/ego2.sys",
		// Dir:      "/Users/jingyang/Desktop/project/isyanthony/clickvisual/api/internal/service/inquiry/agent/ego2.sys",
		PageSize: 400,
		Query:    "lv=info",
	}

	agent := Agent{}
	_, req.Interval = agent.CalculateInterval(req.ET-req.ST, "")
	charts, _, err := agent.Chart(req)
	if err != nil {
		panic(err)
	}
	for i, chart := range charts {
		fmt.Printf("=========== %d ============= \n", i)
		fmt.Println("count: ", chart.Count)
		fmt.Println("from: ", chart.From)
		fmt.Println("to: ", chart.To)
		fmt.Printf("=========== %d ============= \n", i)
	}

	fmt.Printf("res.len: %d, interval: %d \n", len(charts), req.Interval)
}

func TestMockInterval2(t *testing.T) {
	var comp_words = []string{
		"test1 23dasda'",
		"test2",
		"test3",
		"test4",
		"'test5",
		"test6 error'",
		"test7",
		"test8 is not right'",
		"test9",
	}

	var etc_words = []string{
		"test1 23dasda'",
		"test2",
		"test3",
		"test4",
		"test5",
		"test6 error",
		"test7",
		"test8 is not right",
		"test9",
	}

	var info_level = []string{
		"info",
		"error",
		"warn",
		"debug",
	}

	n := len(etc_words)
	writer, err := os.OpenFile("./ego2.sys", os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		panic(err)
	}
	lines := 50_0000
	now := time.Now().Unix() - 60*60*24*365*5
	for i := 0; i < lines; i++ {
		log := `{"lv":"%s","ts":"%s","comp":"%s","etc":"%s","compName":"eventWorker.kafka","addr":"[kafka:9092]"}`
		now = now + int64(rand.Intn(5))
		writer.WriteString(fmt.Sprintf(log+"\n", info_level[rand.Intn(4)], time.UnixMilli(now*1000).Format("2006-01-02 15:04:05"), comp_words[rand.Intn(n)], etc_words[rand.Intn(n)]))
	}

}
