package db

// AlarmAIGroup records the newest incident for one stable alert fingerprint.
type AlarmAIGroup struct {
	BaseModel
	Fingerprint   string `gorm:"size:64;uniqueIndex:uidx_alarm_ai_fingerprint"`
	Version       int64
	StartsAt      int64
	ResolvedAt    int64
	LastSuccessAt int64
	JobID         int
}

func (AlarmAIGroup) TableName() string { return "cv_alarm_ai_group" }

// AlarmAIAnalysis preserves its completed Snapshot before any channel is sent.
type AlarmAIAnalysis struct {
	BaseModel
	GroupID         int    `gorm:"index:idx_alarm_ai_group"`
	Token           string `gorm:"size:64;uniqueIndex:uidx_alarm_ai_token"`
	AlarmID         int
	FilterID        int
	Uid             int
	Tid             int
	StartsAt        int64
	WindowStart     int64
	WindowEnd       int64
	Title           string `gorm:"size:255"`
	Description     string `gorm:"type:text"`
	Query           string `gorm:"type:text"`
	ChannelIDs      Ints   `gorm:"type:text"`
	CooldownSeconds int
	EventCount      int
	Status          string `gorm:"size:16;index:idx_alarm_ai_due"`
	Attempts        int
	NextAttemptAt   int64  `gorm:"index:idx_alarm_ai_due"`
	LeaseOwner      string `gorm:"size:64"`
	LeaseUntil      int64
	Summary         string `gorm:"type:text"`
	Snapshot        string `gorm:"type:longtext"`
}

func (AlarmAIAnalysis) TableName() string { return "cv_alarm_ai_analysis" }

type AlarmAIDelivery struct {
	BaseModel
	AnalysisID int    `gorm:"uniqueIndex:uidx_alarm_ai_delivery"`
	ChannelID  int    `gorm:"uniqueIndex:uidx_alarm_ai_delivery"`
	Status     string `gorm:"size:16"`
	Attempts   int
	LeaseOwner string `gorm:"size:64"`
	LeaseUntil int64
}

func (AlarmAIDelivery) TableName() string { return "cv_alarm_ai_delivery" }
