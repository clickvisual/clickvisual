package db

const (
	ReportAccelerationStatusPending      = "pending"
	ReportAccelerationStatusProvisioning = "provisioning"
	ReportAccelerationStatusBackfilling  = "backfilling"
	ReportAccelerationStatusReady        = "ready"
	ReportAccelerationStatusRebuilding   = "rebuilding"
	ReportAccelerationStatusError        = "error"
	ReportAccelerationStatusDeleting     = "deleting"
)

type ReportAcceleration struct {
	BaseModel

	ReportID           int    `gorm:"column:report_id;type:int(11);NOT NULL;uniqueIndex:uniq_report_acceleration_report_id" json:"reportId"`
	InstanceID         int    `gorm:"column:instance_id;type:int(11);NOT NULL;default:0" json:"instanceId"`
	SourceDatabase     string `gorm:"column:source_database;type:varchar(128);NOT NULL" json:"sourceDatabase"`
	SourceTable        string `gorm:"column:source_table;type:varchar(128);NOT NULL" json:"sourceTable"`
	SourceTimeField    string `gorm:"column:source_time_field;type:varchar(128);NOT NULL" json:"sourceTimeField"`
	TargetTable        string `gorm:"column:target_table;type:varchar(128);NOT NULL" json:"targetTable"`
	MVName             string `gorm:"column:mv_name;type:varchar(128);NOT NULL" json:"mvName"`
	FilterSQL          string `gorm:"column:filter_sql;type:longtext" json:"filterSql"`
	BuilderFingerprint string `gorm:"column:builder_fingerprint;type:varchar(64);NOT NULL;index:idx_report_acceleration_fingerprint" json:"builderFingerprint"`
	BackfillStartAt    int64  `gorm:"column:backfill_start_at;type:bigint" json:"backfillStartAt"`
	BackfillEndAt      int64  `gorm:"column:backfill_end_at;type:bigint" json:"backfillEndAt"`
	DDLSQL             string `gorm:"column:ddl_sql;type:longtext" json:"ddlSql"`
	Status             string `gorm:"column:status;type:varchar(32);NOT NULL;default:pending;index:idx_report_acceleration_status" json:"status"`
	ErrorMessage       string `gorm:"column:error_message;type:text" json:"errorMessage"`
}

func (m *ReportAcceleration) TableName() string {
	return TableNameReportAcceleration
}
