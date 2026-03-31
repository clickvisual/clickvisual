package view

type ReqReportSchedule struct {
	NodeID        int    `json:"nodeId" form:"nodeId"`
	Desc          string `json:"desc" form:"desc"`
	DutyUID       int    `json:"dutyUid" form:"dutyUid"`
	Cron          string `json:"cron" form:"cron"`
	Typ           int    `json:"typ" form:"typ"`
	ChannelIDs    []int  `json:"channelIds" form:"channelIds"`
	IsRetry       int    `json:"isRetry" form:"isRetry"`
	RetryTimes    int    `json:"retryTimes" form:"retryTimes"`
	RetryInterval int    `json:"retryInterval" form:"retryInterval"`
}

type RespReportSchedule struct {
	NodeID        int    `json:"nodeId"`
	Desc          string `json:"desc"`
	DutyUID       int    `json:"dutyUid"`
	Cron          string `json:"cron"`
	Typ           int    `json:"typ"`
	ChannelIDs    []int  `json:"channelIds"`
	IsRetry       int    `json:"isRetry"`
	RetryTimes    int    `json:"retryTimes"`
	RetryInterval int    `json:"retryInterval"`
}

type RespReportListItem struct {
	ID        int    `json:"id"`
	NodeID    int    `json:"nodeId"`
	Name      string `json:"name"`
	Desc      string `json:"desc"`
	Status    string `json:"status"`
	DutyUID   int    `json:"dutyUid"`
	UpdatedAt string `json:"updatedAt"`
}

type RespReportEditorDraft struct {
	ReportID            int    `json:"reportId"`
	NodeID              int    `json:"nodeId"`
	Name                string `json:"name"`
	Desc                string `json:"desc"`
	QueryMode           string `json:"queryMode"`
	QueryText           string `json:"queryText"`
	TemplateKey         string `json:"templateKey"`
	OutputFormat        string `json:"outputFormat"`
	RecipientChannelIDs []int  `json:"recipientChannelIds"`
}

type RespReportChannel struct {
	ID      int    `json:"id"`
	Key     string `json:"key"`
	Name    string `json:"name"`
	Typ     string `json:"typ"`
	Enabled bool   `json:"enabled"`
	Token   string `json:"token"`
	Webhook string `json:"webhook"`
}

type RespReportExecutionPreview struct {
	ReportID  int    `json:"reportId"`
	CanRun    bool   `json:"canRun"`
	NextRunAt string `json:"nextRunAt"`
	LastRunAt string `json:"lastRunAt"`
	Message   string `json:"message"`
}

type RespReportExecutionRecord struct {
	ID              int    `json:"id"`
	ReportID        int    `json:"reportId"`
	Status          string `json:"status"`
	Trigger         string `json:"trigger"`
	StartedAt       string `json:"startedAt"`
	EndedAt         string `json:"endedAt"`
	DurationSeconds int    `json:"durationSeconds"`
	OperatorName    string `json:"operatorName"`
}

type RespReportScheduleExecutionSummary struct {
	Status       string `json:"status"`
	Trigger      string `json:"trigger"`
	StartedAt    string `json:"startedAt"`
	EndedAt      string `json:"endedAt"`
	OperatorName string `json:"operatorName"`
}

type RespReportScheduleRuntime struct {
	Registered             bool                                `json:"registered"`
	Paused                 bool                                `json:"paused"`
	NextRunAt              string                              `json:"nextRunAt"`
	LastScheduledExecution *RespReportScheduleExecutionSummary `json:"lastScheduledExecution,omitempty"`
}

type RespReportChannelSendSummary struct {
	ChannelID  int    `json:"channelId"`
	ChannelTyp string `json:"channelTyp"`
	Success    int    `json:"success"`
	Failed     int    `json:"failed"`
	LastSentAt string `json:"lastSentAt"`
}

type RespReportSendSummary struct {
	ReportID int                            `json:"reportId"`
	Total    int                            `json:"total"`
	Success  int                            `json:"success"`
	Failed   int                            `json:"failed"`
	Channels []RespReportChannelSendSummary `json:"channels"`
}

type RespReportWorkspace struct {
	ActiveReportID int                         `json:"activeReportId"`
	List           []RespReportListItem        `json:"list"`
	Editor         RespReportEditorDraft       `json:"editor"`
	Schedule       RespReportSchedule          `json:"schedule"`
	Preview        RespReportExecutionPreview  `json:"preview"`
	Executions     []RespReportExecutionRecord `json:"executions"`
	Delivery       RespReportSendSummary       `json:"delivery"`
	Channels       []RespReportChannel         `json:"channels"`
	Runtime        RespReportScheduleRuntime   `json:"runtime"`
}

type RespReportPreviewRunResult struct {
	Preview   RespReportExecutionPreview `json:"preview"`
	Execution RespReportExecutionRecord  `json:"execution"`
	Delivery  RespReportSendSummary      `json:"delivery"`
}
