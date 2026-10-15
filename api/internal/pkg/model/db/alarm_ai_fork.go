package db

// AlarmAIFork makes transport retries of one link visit idempotent per user.
type AlarmAIFork struct {
	BaseModel
	UID        int    `gorm:"column:uid;uniqueIndex:idx_alarm_ai_fork_request"`
	RequestID  string `gorm:"column:request_id;type:varchar(64);uniqueIndex:idx_alarm_ai_fork_request"`
	AnalysisID int    `gorm:"column:analysis_id;not null"`
	SessionID  int    `gorm:"column:session_id;not null;default:0"`
}

func (AlarmAIFork) TableName() string { return "cv_alarm_ai_fork" }
