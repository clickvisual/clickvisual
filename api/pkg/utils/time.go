package utils

func CalculateInterval(interval int64) int64 {
	if interval <= 60 {
		return 1
	} else if interval <= 60*5 {
		return 10
	} else if interval <= 60*15 {
		return 30
	} else if interval <= 60*60 {
		return 60
	} else if interval <= 60*60*4 {
		return 60 * 5
	} else if interval <= 60*60*24 {
		return 60 * 30
	} else if interval <= 60*60*24*7 {
		return 60 * 60 * 4
	} else if interval <= 60*60*24*30 {
		return 60 * 60 * 12
	}
	return interval / 50
}
