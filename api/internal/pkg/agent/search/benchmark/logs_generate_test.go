package benchmark

import (
	"fmt"
	"math/rand"
	"os"
	"testing"
	"time"
)

type Category struct {
	content string
	count   int64
}

type CasesFile struct {
	path          string
	st            int64
	et            int64
	interval      int64
	logCategories []Category
	count         int64
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
					content: `{"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   500,
				},
				{
					content: `{"tss":%d,"lv":"error","key":"service down","msg":"invalid input, make sure what you input is right","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   2560000 - 500,
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
					content: `{"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   500,
				},
				{
					content: `{"tss":%d,"lv":"error","key":"service down","msg":"invalid input, make sure what you input is right","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   524_0000 - 500,
				},
			},
		},
		{
			path:     "./debug.sys",
			count:    1_0000,
			st:       1697356924 - 60*60*24*15,
			et:       1697356924,
			interval: 60 * 60 * 24 * 15,
			logCategories: []Category{
				{
					content: `{"tss":%d,"lv":"info","key":"service down","msg":"cannot support xxx operation or xxxxxxx","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   2000,
				},
				{
					content: `{"tss":%d,"lv":"error","key":"service down","msg":"invalid input, make sure what you input is right","addr":"[xxxx service:xxxx] heartbeat down","ts":"%s"}`,
					count:   1_0000 - 2000,
				},
			},
		},
	}
)

func TestGenerateTestFile(t *testing.T) {
	fmt.Println("start generate log")
	file := casesFiles[0]

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

	var i int64 = 0
	for i = 0; i < file.count; i++ {
		record += rand.Int63n(file.interval / file.count)
		idx := rand.Int63n(int64(100)) % n
		pos := int64(q[idx])
		mp[pos]--
		if mp[pos] <= 0 {
			delete(mp, pos)
			q = append(q[:idx], q[idx+1:]...)
			n--
		}

		writer.WriteString(fmt.Sprintf(file.logCategories[pos].content+"\n", record, time.Unix(record, 0).Format("2006-01-02 15:04:05")))
	}
}
