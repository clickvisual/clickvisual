package view

type ReqReportDefinition struct {
	ReportID     int               `json:"reportId" form:"reportId"`
	Name         string            `json:"name" form:"name"`
	Desc         string            `json:"desc" form:"desc"`
	Status       string            `json:"status" form:"status"`
	QueryMode    string            `json:"queryMode" form:"queryMode"`
	QueryText    string            `json:"queryText" form:"queryText"`
	TemplateKey  string            `json:"templateKey" form:"templateKey"`
	OutputFormat string            `json:"outputFormat" form:"outputFormat"`
	DutyUID      int               `json:"dutyUid" form:"dutyUid"`
	CreatorUID   int               `json:"creatorUid" form:"creatorUid"`
	Builder      *ReqReportBuilder `json:"builder" form:"builder"`
}

type ReqReportMetric struct {
	Key        string `json:"key" form:"key"`
	Label      string `json:"label" form:"label"`
	Expression string `json:"expression" form:"expression"`
	GroupBy    string `json:"groupBy" form:"groupBy"`
	Limit      int    `json:"limit" form:"limit"`
}

type ReqReportBlock struct {
	Key     string            `json:"key" form:"key"`
	Label   string            `json:"label" form:"label"`
	Where   string            `json:"where" form:"where"`
	Metrics []ReqReportMetric `json:"metrics" form:"metrics"`
}

type ReqReportBuilder struct {
	InstanceID int               `json:"instanceId" form:"instanceId"`
	Cluster    string            `json:"cluster" form:"cluster"`
	Database   string            `json:"database" form:"database"`
	Table      string            `json:"table" form:"table"`
	TimeField  string            `json:"timeField" form:"timeField"`
	TimeRange  string            `json:"timeRange" form:"timeRange"`
	Where      string            `json:"where" form:"where"`
	Metrics    []ReqReportMetric `json:"metrics" form:"metrics"`
	Blocks     []ReqReportBlock  `json:"blocks" form:"blocks"`
}

type ReqReportWhereCheck struct {
	Builder       ReqReportBuilder `json:"builder" form:"builder"`
	Where         string           `json:"where" form:"where"`
	WindowSeconds int              `json:"windowSeconds" form:"windowSeconds"`
}

type RespReportDefinition struct {
	ReportID     int               `json:"reportId"`
	Name         string            `json:"name"`
	Desc         string            `json:"desc"`
	Status       string            `json:"status"`
	QueryMode    string            `json:"queryMode"`
	QueryText    string            `json:"queryText"`
	TemplateKey  string            `json:"templateKey"`
	OutputFormat string            `json:"outputFormat"`
	DutyUID      int               `json:"dutyUid"`
	CreatorUID   int               `json:"creatorUid"`
	UpdatedAt    string            `json:"updatedAt"`
	Builder      *ReqReportBuilder `json:"builder,omitempty"`
}

type ReqReportSchedule struct {
	NodeID        int    `json:"nodeId" form:"nodeId"`
	Desc          string `json:"desc" form:"desc"`       // Deprecated: 报表定义字段，请改用 /api/v2/reports
	DutyUID       int    `json:"dutyUid" form:"dutyUid"` // Deprecated: 报表定义字段，请改用 /api/v2/reports
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
	ReportID            int               `json:"reportId"`
	NodeID              int               `json:"nodeId"`
	Name                string            `json:"name"`
	Desc                string            `json:"desc"`
	QueryMode           string            `json:"queryMode"`
	QueryText           string            `json:"queryText"`
	TemplateKey         string            `json:"templateKey"`
	OutputFormat        string            `json:"outputFormat"`
	RecipientChannelIDs []int             `json:"recipientChannelIds"`
	Builder             *ReqReportBuilder `json:"builder,omitempty"`
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
	ID              int                            `json:"id"`
	ReportID        int                            `json:"reportId"`
	Status          string                         `json:"status"`
	Trigger         string                         `json:"trigger"`
	StartedAt       string                         `json:"startedAt"`
	EndedAt         string                         `json:"endedAt"`
	DurationSeconds int                            `json:"durationSeconds"`
	OperatorName    string                         `json:"operatorName"`
	ErrorMessage    string                         `json:"errorMessage"`
	ChannelResults  []RespReportChannelSendSummary `json:"channelResults"`
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
	ChannelID     int      `json:"channelId"`
	ChannelTyp    string   `json:"channelTyp"`
	Success       int      `json:"success"`
	Failed        int      `json:"failed"`
	LastSentAt    string   `json:"lastSentAt"`
	Attempts      int      `json:"attempts"`
	Retried       int      `json:"retried"`
	RetryTimes    int      `json:"retryTimes"`
	RetryInterval int      `json:"retryInterval"`
	Errors        []string `json:"errors,omitempty"`
}

type RespReportSendSummary struct {
	ReportID int                            `json:"reportId"`
	Total    int                            `json:"total"`
	Success  int                            `json:"success"`
	Failed   int                            `json:"failed"`
	Channels []RespReportChannelSendSummary `json:"channels"`
}

type RespReportAcceleration struct {
	Status          string                       `json:"status"`
	TargetTable     string                       `json:"targetTable"`
	MVName          string                       `json:"mvName"`
	ErrorMessage    string                       `json:"errorMessage"`
	BackfillStartAt string                       `json:"backfillStartAt,omitempty"`
	BackfillEndAt   string                       `json:"backfillEndAt,omitempty"`
	LastCheck       *RespReportAccelerationCheck `json:"lastCheck,omitempty"`
}

type RespReportAccelerationCheckBucket struct {
	BucketTime      string `json:"bucketTime"`
	AggregatedValue int64  `json:"aggregatedValue"`
	DirectValue     int64  `json:"directValue"`
}

type RespReportAccelerationCheckBlock struct {
	BlockKey          string                              `json:"blockKey"`
	BlockLabel        string                              `json:"blockLabel"`
	MetricName        string                              `json:"metricName"`
	AggregatedTotal   int64                               `json:"aggregatedTotal"`
	DirectTotal       int64                               `json:"directTotal"`
	MismatchedBuckets []RespReportAccelerationCheckBucket `json:"mismatchedBuckets"`
}

type RespReportAccelerationCheck struct {
	WindowStart string                             `json:"windowStart"`
	WindowEnd   string                             `json:"windowEnd"`
	Passed      bool                               `json:"passed"`
	Summary     string                             `json:"summary"`
	Blocks      []RespReportAccelerationCheckBlock `json:"blocks"`
}

type RespReportAccelerationBackfillResult struct {
	Acceleration RespReportAcceleration      `json:"acceleration"`
	Check        RespReportAccelerationCheck `json:"check"`
}

type RespReportResultPoint struct {
	BucketTime string  `json:"bucketTime"`
	BlockKey   string  `json:"blockKey"`
	BlockLabel string  `json:"blockLabel"`
	MetricName string  `json:"metricName"`
	MetricKind string  `json:"metricKind"`
	GroupKind  int     `json:"groupKind"`
	GroupValue string  `json:"groupValue"`
	Value      float64 `json:"value"`
	SumValue   float64 `json:"sumValue"`
	CountValue float64 `json:"countValue"`
	UniqValue  float64 `json:"uniqValue"`
}

type RespReportResultSeries struct {
	SeriesKey  string                  `json:"seriesKey"`
	BlockKey   string                  `json:"blockKey"`
	BlockLabel string                  `json:"blockLabel"`
	MetricName string                  `json:"metricName"`
	MetricKind string                  `json:"metricKind"`
	GroupKind  int                     `json:"groupKind"`
	GroupValue string                  `json:"groupValue"`
	Total      float64                 `json:"total"`
	Points     []RespReportResultPoint `json:"points"`
}

type RespReportResultData struct {
	ReportID    int                      `json:"reportId"`
	Source      string                   `json:"source"`
	Database    string                   `json:"database"`
	TargetTable string                   `json:"targetTable"`
	WindowStart string                   `json:"windowStart"`
	WindowEnd   string                   `json:"windowEnd"`
	BucketCount int                      `json:"bucketCount"`
	Series      []RespReportResultSeries `json:"series"`
	Rows        []RespReportResultPoint  `json:"rows"`
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
	Acceleration   RespReportAcceleration      `json:"acceleration"`
}

type RespReportPreviewRunResult struct {
	Preview   RespReportExecutionPreview `json:"preview"`
	Execution RespReportExecutionRecord  `json:"execution"`
	Delivery  RespReportSendSummary      `json:"delivery"`
}

type RespReportDeleteResult struct {
	ReportID int `json:"reportId"`
}

type RespReportSourceInstance struct {
	ID       int      `json:"id"`
	Name     string   `json:"name"`
	Desc     string   `json:"desc"`
	Clusters []string `json:"clusters"`
}

type RespReportSourceDatabase struct {
	Name string `json:"name"`
}

type RespReportSourceTable struct {
	Name string `json:"name"`
}

type RespReportWhereCheck struct {
	Passed        bool   `json:"passed"`
	RowCount      int64  `json:"rowCount"`
	WindowStart   string `json:"windowStart"`
	WindowEnd     string `json:"windowEnd"`
	WindowSeconds int    `json:"windowSeconds"`
	Query         string `json:"query"`
	Message       string `json:"message"`
}
