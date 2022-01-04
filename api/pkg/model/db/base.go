package db

import (
	"fmt"

	sdelete "gorm.io/plugin/soft_delete"
)

const (
	TableNameUser     = "mogo_user"
	TableNameIndex    = "mogo_index"
	TableNameCluster  = "mogo_cluster"
	TableNameInstance = "mogo_instance"
)

type BaseModel struct {
	ID    int               `gorm:"not null;primary_key;AUTO_INCREMENT" json:"id"` // 主键
	Ctime int64             `gorm:"bigint;autoCreateTime;comment:创建时间" json:"ctime"`
	Utime int64             `gorm:"bigint;autoUpdateTime;comment:更新时间" json:"utime"`
	Dtime sdelete.DeletedAt `gorm:"bigint;comment:删除时间" json:"dtime"`
}

type ReqPage struct {
	Current  int    `json:"current" form:"current"`
	PageSize int    `json:"pageSize" form:"pageSize"`
	Sort     string `json:"sort" form:"sort"`
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
