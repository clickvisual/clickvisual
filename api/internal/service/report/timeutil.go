package report

import "time"

func reportNow() time.Time {
	return time.Now().In(reportScheduleLocation)
}

func reportDisplayTime(t time.Time) time.Time {
	if t.IsZero() {
		return t
	}
	return t.In(reportScheduleLocation)
}

func formatReportTime(t time.Time) string {
	return reportDisplayTime(t).Format("2006-01-02 15:04:05")
}
