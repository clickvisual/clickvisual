package db

type ConfigurationPublish struct {
	BaseModel

	Uid                    uint `gorm:"column:uid;type:int(11) unsigned" json:"uid"`
	ConfigurationId        uint `gorm:"column:configuration_id;type:int(11) unsigned" json:"configurationId"`
	ConfigurationHistoryId uint `gorm:"column:configuration_history_id;type:int(11) unsigned" json:"configurationHistoryId"`
}

func (m *ConfigurationPublish) TableName() string {
	return TableNameConfigurationPublish
}
