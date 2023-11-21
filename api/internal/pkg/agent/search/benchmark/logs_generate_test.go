package benchmark

import (
	"fmt"
	"math/rand"
	"os"
	"testing"
	"time"
)

type Category struct {
	content         string
	count           int64
	filter          string
	conditionSearch bool
}

type CasesFile struct {
	path          string
	st            int64
	et            int64
	interval      int64
	logCategories []Category
	count         int64
	skip          bool
}

var (
	casesFiles = []CasesFile{
		{
			path:     "./256w.sys",
			count:    256_0000,
			st:       1697356924 - 60*60*24*365*2,
			et:       1697356924,
			interval: 60 * 60 * 24 * 365 * 2,
			logCategories: []Category{
				{
					content: `2023-11-02T09:56:29.00040529+08:00 stderr F {"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   500000,
					filter:  "lv=info and msg=cannot support xxx operation or xxxxxxx",
				},
				{
					content: `2023-11-02T09:56:29.00040529+08:00 stderr F {"tss":%d,"lv":"error","key":"service down","msg":"invalid input, make sure what you input is right","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   2560000 - 500000,
					filter:  "lv=error and msg=invalid input, make sure what you input is right",
				},
			},
		},
		{
			path:     "./524w.sys",
			count:    524_0000,
			st:       1697356924 - 60*60*24*365*3,
			et:       1697356924,
			interval: 60 * 60 * 24 * 365 * 3,
			logCategories: []Category{
				{
					content: `2023-11-02T09:56:29.00040529+08:00 stderr F {"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   100_0000,
					filter:  "lv=info and msg=cannot support xxx operation or xxxxxxx",
				},
				{
					content: `2023-11-02T09:56:29.00040529+08:00 stderr F {"tss":%d,"lv":"error","key":"service down","msg":"invalid input, make sure what you input is right","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   524_0000 - 100_0000,
					filter:  "lv=error and msg=invalid input, make sure what you input is right",
				},
			},
		},
		{
			skip:     true,
			path:     "./debug.sys",
			count:    1_0000,
			st:       1697356924 - 60*60*24*15,
			et:       1697356924,
			interval: 60 * 60 * 24 * 15,
			logCategories: []Category{
				{
					content: `2023-11-02T09:56:29.00040529+08:00 stderr F {"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   1500,
					filter:  "lv=info and msg=cannot support xxx operation or xxxxxxx",
				},
				{
					content: `2023-11-02T09:56:29.00040529+08:00 stderr F {"tss":%d,"lv":"error","key":"service down","msg":"invalid input, make sure what you input is right","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   1_0000 - 2000,
					filter:  "lv=error and msg=invalid input, make sure what you input is right",
				},
				{
					content:         `2023-11-02T09:56:29.00040529+08:00 stderr F {adwakdjklawjdlkeat down"`,
					count:           500,
					conditionSearch: true,
				},
			},
		},
	}
)

func TestGenerateTestFile(t *testing.T) {
	for k := 0; k < len(casesFiles); k++ {
		file := casesFiles[k]
		if file.skip {
			continue
		}
		writer, err := os.OpenFile(file.path, os.O_RDWR|os.O_CREATE, 0666)
		if err != nil {
			panic(err)
		}

		record := file.st
		mp := make(map[int64]int64)
		logslen := len(file.logCategories)

		var n int64 = int64(logslen)
		for i := 0; i < logslen; i++ {
			mp[int64(i)] = file.logCategories[i].count
		}
		q := make([]int, n)

		for i := 0; i < logslen; i++ {
			q[i] = i
		}

		for i := 0; i < int(file.count); i++ {
			record += rand.Int63n(file.interval / file.count)
			idx := rand.Int63n(int64(100)) % n
			pos := int64(q[idx])
			mp[pos]--
			if mp[pos] <= 0 {
				delete(mp, pos)
				q = append(q[:idx], q[idx+1:]...)
				n--
			}
			log := file.logCategories[pos]
			if log.conditionSearch {
				_, _ = writer.WriteString(log.content + "\n")
			} else {
				_, _ = writer.WriteString(fmt.Sprintf(file.logCategories[pos].content+"\n", record, time.Unix(record, 0).Format("2006-01-02 15:04:05")))
			}
		}
	}
}

func GenerateTestLogFile(start, end, lines int64, name string) {
	writter, err := os.OpenFile(name, os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		panic(err)
	}
	rands := (end - start) / lines
	for i := int64(0); i < lines; i++ {
		start += rand.Int63n(rands)
		_, _ = writter.WriteString(fmt.Sprintf(`{"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`+"\n", start, time.Unix(start, 0).Format("2006-01-02 15:04:05")))
	}
}

func TestGenerateFile(t *testing.T) {
	GenerateTestLogFile(1698652360, 1698652420, 12, "12.log")
}
