package db

import (
	"time"
)

type Configuration struct {
	Name        string    `gorm:"column:name;type:varchar(64)" json:"name"`
	Content     string    `gorm:"column:content;type:longtext" json:"content"`
	Format      string    `gorm:"column:format;type:varchar(32)" json:"format"`
	Version     string    `gorm:"column:version;type:varchar(64)" json:"version"`
	Uid         uint      `gorm:"column:uid;type:int(11) unsigned" json:"uid"`
	PublishTime int       `gorm:"column:publish_time;type:int(11)" json:"publishTime"`
	LockUid     uint      `gorm:"column:lock_uid;type:int(11) unsigned" json:"lockUid"`
	LockAt      time.Time `gorm:"column:lock_at;type:datetime" json:"lockAt"`

	BaseModel
}

func (m *Configuration) TableName() string {
	return "mogo_configuration"
}

type ConfigurationHistory struct {
	Uid             uint   `gorm:"column:uid;type:int(11) unsigned" json:"uid"`
	ConfigurationId uint   `gorm:"column:configuration_id;type:int(11) unsigned" json:"configurationId"`
	ChangeLog       string `gorm:"column:change_log;type:longtext" json:"changeLog"`
	Content         string `gorm:"column:content;type:longtext" json:"content"`
	Version         string `gorm:"column:version;type:varchar(64)" json:"version"`

	BaseModel
}

func (m *ConfigurationHistory) TableName() string {
	return "mogo_configuration_history"
}

type ConfigurationPublish struct {
	Uid                    uint   `gorm:"column:uid;type:int(11) unsigned" json:"uid"`
	ConfigurationId        uint   `gorm:"column:configuration_id;type:int(11) unsigned" json:"configurationId"`
	ConfigurationHistoryId uint   `gorm:"column:configuration_history_id;type:int(11) unsigned" json:"configurationHistoryId"`
	ApplyInstance          string `gorm:"column:apply_instance;type:varchar(255)" json:"applyInstance"`
	FilePath               string `gorm:"column:file_path;type:varchar(255)" json:"filePath"`

	BaseModel
}

func (m *ConfigurationPublish) TableName() string {
	return "mogo_configuration_publish"
}
