package db

import (
	"fmt"

	sdelete "gorm.io/plugin/soft_delete"
)

const (
	TableNameView     = "mogo_base_view"
	TableNameTable    = "mogo_base_table"
	TableNameIndex    = "mogo_base_index"
	TableNameDatabase = "mogo_base_database"
	TableNameInstance = "mogo_base_instance"

	TableNameUser = "mogo_user"

	TableNameCluster = "mogo_cluster"

	TableNameConfiguration        = "mogo_configuration"
	TableNameConfigurationHistory = "mogo_configuration_history"
	TableNameConfigurationPublish = "mogo_configuration_publish"

	TableNameK8SConfigMap = "mogo_k8s_cm"
)

type BaseModel struct {
	ID    int               `gorm:"not null;primary_key;AUTO_INCREMENT" json:"id"` // 主键
	Ctime int64             `gorm:"bigint;autoCreateTime;comment:创建时间" json:"ctime"`
	Utime int64             `gorm:"bigint;autoUpdateTime;comment:更新时间" json:"utime"`
	Dtime sdelete.DeletedAt `gorm:"bigint;comment:删除时间" json:"dtime"`
}

type ReqPage struct {
	Current  int `json:"current" form:"current"`
	PageSize int `json:"pageSize" form:"pageSize"`
}

func (r *ReqPage) Valid() error {
	if r.Current == 0 {
		r.Current = 1
	}
	if r.PageSize == 0 {
		r.PageSize = 10
	}
	if r.Current < 0 {
		return fmt.Errorf("current MUST be larger than 0")
	}
	if r.PageSize < 0 {
		return fmt.Errorf("invalid pageSize")
	}
	return nil
}
