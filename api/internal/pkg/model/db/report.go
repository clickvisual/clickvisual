package db

const (
	ReportStatusEnabled = "enabled"
	ReportStatusPaused  = "paused"

	ReportQueryModeSQL = "sql"

	ReportOutputFormatMarkdown = "markdown"

	ReportScheduleStatusEnabled = "enabled"
	ReportScheduleStatusPaused  = "paused"

	ReportTriggerManual   = "manual"
	ReportTriggerSchedule = "schedule"

	ReportExecutionStatusRunning = "running"
	ReportExecutionStatusSuccess = "success"
	ReportExecutionStatusFailed  = "failed"
	ReportExecutionStatusPartial = "partial"
)

type Report struct {
	BaseModel

	Name          string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
	Desc          string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"`
	Status        string `gorm:"column:status;type:varchar(32);NOT NULL;default:enabled;index:idx_report_status" json:"status"`
	QueryMode     string `gorm:"column:query_mode;type:varchar(32);NOT NULL;default:sql" json:"queryMode"`
	QueryText     string `gorm:"column:query_text;type:text" json:"queryText"`
	BuilderConfig string `gorm:"column:builder_config;type:longtext" json:"builderConfig"`
	TemplateKey   string `gorm:"column:template_key;type:varchar(128);NOT NULL" json:"templateKey"`
	OutputFormat  string `gorm:"column:output_format;type:varchar(32);NOT NULL;default:markdown" json:"outputFormat"`
	DutyUID       int    `gorm:"column:duty_uid;type:int(11)" json:"dutyUid"`
	CreatorUID    int    `gorm:"column:creator_uid;type:int(11)" json:"creatorUid"`
}

func (m *Report) TableName() string {
	return TableNameReport
}

type ReportSchedule struct {
	ReportID      int    `gorm:"column:report_id;type:int(11);NOT NULL;primaryKey" json:"reportId"`
	Cron          string `gorm:"column:cron;type:varchar(255);NOT NULL" json:"cron"`
	Status        string `gorm:"column:status;type:varchar(32);NOT NULL;default:enabled;index:idx_report_schedule_status" json:"status"`
	ChannelIDs    Ints   `gorm:"column:channel_ids;type:text;NOT NULL" json:"channelIds"` // JSON text array of cv_alarm_channel.id
	IsRetry       int    `gorm:"column:is_retry;type:tinyint(1);NOT NULL;default:0" json:"isRetry"`
	RetryTimes    int    `gorm:"column:retry_times;type:int(11);NOT NULL;default:0" json:"retryTimes"`
	RetryInterval int    `gorm:"column:retry_interval;type:int(11);NOT NULL;default:0" json:"retryInterval"`
	LastRunAt     int64  `gorm:"column:last_run_at;type:bigint" json:"lastRunAt"`
	NextRunAt     int64  `gorm:"column:next_run_at;type:bigint" json:"nextRunAt"`
	Ctime         int64  `gorm:"column:ctime;bigint;autoCreateTime;comment:创建时间" json:"ctime"`
	Utime         int64  `gorm:"column:utime;bigint;autoUpdateTime;comment:更新时间" json:"utime"`
}

func (m *ReportSchedule) TableName() string {
	return TableNameReportSchedule
}

type ReportExecution struct {
	BaseModel

	ReportID        int    `gorm:"column:report_id;type:int(11);NOT NULL;index:idx_report_execution_report_id" json:"reportId"`
	Trigger         string `gorm:"column:trigger;type:varchar(32);NOT NULL;index:idx_report_execution_trigger" json:"trigger"`
	Status          string `gorm:"column:status;type:varchar(32);NOT NULL;index:idx_report_execution_status" json:"status"`
	StartedAt       int64  `gorm:"column:started_at;type:bigint;NOT NULL" json:"startedAt"`
	EndedAt         int64  `gorm:"column:ended_at;type:bigint" json:"endedAt"`
	DurationSeconds int    `gorm:"column:duration_seconds;type:int(11);NOT NULL;default:0" json:"durationSeconds"`
	OperatorName    string `gorm:"column:operator_name;type:varchar(64);NOT NULL" json:"operatorName"`
	ErrorMessage    string `gorm:"column:error_message;type:text" json:"errorMessage"`
	ChannelResults  string `gorm:"column:channel_results;type:longtext;comment:JSON text of per-channel send results" json:"channelResults"` // JSON text
	RenderedTitle   string `gorm:"column:rendered_title;type:varchar(255);NOT NULL" json:"renderedTitle"`
	RenderedContent string `gorm:"column:rendered_content;type:longtext" json:"renderedContent"`
}

func (m *ReportExecution) TableName() string {
	return TableNameReportExecution
}
