package utils

import (
	"fmt"
)

func CalculateInterval(interval int64, timeField string) (string, int64) {
	if interval == 0 {
		return "", 0
	}
	if interval <= 60*5 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 second)", timeField), 1
	} else if interval <= 60*30 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 minute)", timeField), 60
	} else if interval <= 60*60*4 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 10 minute)", timeField), 600
	} else if interval <= 60*60*24 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 hour)", timeField), 3600
	} else if interval <= 60*60*24*7 {
		return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 6 hour)", timeField), 21600
	}
	return fmt.Sprintf("toStartOfInterval(%s, INTERVAL 1 day)", timeField), 86400
}
