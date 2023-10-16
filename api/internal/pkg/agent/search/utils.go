package search

import (
	"time"

	"github.com/gotomicro/ego/core/elog"
)

func TimeParse(value string) time.Time {
	curTimeParser, err := time.Parse(time.DateTime, value)
	if err != nil {
		curTimeParser, err = time.Parse(time.RFC3339, value)
		if err != nil {
			elog.Error("agent log parse timestamp error", elog.FieldErr(err))
			panic(err)
		}
	}
	return curTimeParser
}
