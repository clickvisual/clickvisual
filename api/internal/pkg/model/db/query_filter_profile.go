package db

import "time"

type QueryFilterProfile struct {
	BaseModel

	Name           string    `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
	InstanceID     int       `gorm:"column:instance_id;type:int(11);NOT NULL;index:idx_query_filter_scope" json:"instanceId"`
	InstanceName   string    `gorm:"column:instance_name;type:varchar(255);NOT NULL" json:"instanceName"`
	DatabaseName   string    `gorm:"column:database_name;type:varchar(255);NOT NULL;index:idx_query_filter_scope" json:"databaseName"`
	TableNameRef   string    `gorm:"column:table_name;type:varchar(255);NOT NULL;index:idx_query_filter_scope" json:"tableName"`
	StartTime      time.Time `gorm:"column:start_time;type:datetime;NOT NULL" json:"startTime"`
	EndTime        time.Time `gorm:"column:end_time;type:datetime;NOT NULL" json:"endTime"`
	ConditionsJSON string    `gorm:"column:conditions_json;type:json;NOT NULL" json:"conditionsJson"`
	Creator        string    `gorm:"column:creator;type:varchar(128);NOT NULL;index:idx_query_filter_creator_name" json:"creator"`
	Updater        string    `gorm:"column:updater;type:varchar(128);NOT NULL" json:"updater"`
}

func (*QueryFilterProfile) TableName() string {
	return TableNameQueryFilterProfile
}
