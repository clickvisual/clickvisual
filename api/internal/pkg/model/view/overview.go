package view

// RespOverviewSummary is the aggregated payload for the v2 overview dashboard.
type RespOverviewSummary struct {
	GeneratedAt int64                 `json:"generatedAt"`
	Ingestion   RespOverviewIngestion `json:"ingestion"`
	Alarm       RespOverviewAlarm     `json:"alarm"`
	Report      RespOverviewReport    `json:"report"`
}

type RespOverviewIngestion struct {
	InstanceCount      int                          `json:"instanceCount"`
	DatabaseCount      int                          `json:"databaseCount"`
	TableCount         int                          `json:"tableCount"`
	NewTablesLast7Days int                          `json:"newTablesLast7Days"`
	CreateTypes        []RespOverviewCreateTypeItem `json:"createTypes"`
	TotalRows          uint64                       `json:"totalRows"`
	TotalBytes         uint64                       `json:"totalBytes"`
	// VolumeUnavailableInstances lists instance names whose system.tables query failed.
	VolumeUnavailableInstances []string                  `json:"volumeUnavailableInstances"`
	TopTables                  []RespOverviewTableVolume `json:"topTables"`
	RecentTables               []RespOverviewTableItem   `json:"recentTables"`
}

type RespOverviewCreateTypeItem struct {
	CreateType int    `json:"createType"`
	Label      string `json:"label"`
	Count      int    `json:"count"`
}

type RespOverviewTableItem struct {
	TableID      int    `json:"tableId"`
	InstanceID   int    `json:"instanceId"`
	InstanceName string `json:"instanceName"`
	DatabaseName string `json:"databaseName"`
	TableName    string `json:"tableName"`
	CreateType   int    `json:"createType"`
	Ctime        int64  `json:"ctime"`
}

type RespOverviewTableVolume struct {
	RespOverviewTableItem
	TotalRows  uint64 `json:"totalRows"`
	TotalBytes uint64 `json:"totalBytes"`
}

type RespOverviewAlarm struct {
	Total         int                     `json:"total"`
	Normal        int                     `json:"normal"`
	Firing        int                     `json:"firing"`
	Closed        int                     `json:"closed"`
	RuleCheck     int                     `json:"ruleCheck"`
	LevelAlarm    int                     `json:"levelAlarm"`
	LevelNotice   int                     `json:"levelNotice"`
	LevelSerious  int                     `json:"levelSerious"`
	TodayCount    int                     `json:"todayCount"`
	Last7DayCount int                     `json:"last7DayCount"`
	PushSuccess   int                     `json:"pushSuccess"`
	PushFail      int                     `json:"pushFail"`
	PushRepeat    int                     `json:"pushRepeat"`
	DailyTrend    []RespOverviewDailyItem `json:"dailyTrend"`
	RecentFiring  []RespOverviewAlarmItem `json:"recentFiring"`
}

type RespOverviewDailyItem struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type RespOverviewAlarmItem struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status int    `json:"status"`
	Level  int    `json:"level"`
	Utime  int64  `json:"utime"`
}

type RespOverviewReport struct {
	Total            int                           `json:"total"`
	Enabled          int                           `json:"enabled"`
	Disabled         int                           `json:"disabled"`
	ScheduleTotal    int                           `json:"scheduleTotal"`
	ScheduleEnabled  int                           `json:"scheduleEnabled"`
	TodayExecutions  int                           `json:"todayExecutions"`
	TodaySuccess     int                           `json:"todaySuccess"`
	TodayFailed      int                           `json:"todayFailed"`
	TodayPartial     int                           `json:"todayPartial"`
	Running          int                           `json:"running"`
	RecentExecutions []RespOverviewReportExecution `json:"recentExecutions"`
	RecentReports    []RespOverviewReportItem      `json:"recentReports"`
}

type RespOverviewReportExecution struct {
	ID              int    `json:"id"`
	ReportID        int    `json:"reportId"`
	ReportName      string `json:"reportName"`
	Status          string `json:"status"`
	Trigger         string `json:"trigger"`
	StartedAt       int64  `json:"startedAt"`
	DurationSeconds int    `json:"durationSeconds"`
}

type RespOverviewReportItem struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Utime  int64  `json:"utime"`
}
