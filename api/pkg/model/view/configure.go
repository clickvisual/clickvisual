package view

import (
	"time"

	"github.com/shimohq/mogo/api/pkg/model/db"
)

// ConfigFormat ..
type ConfigFormat string

// ReqCreateConfig ..
type ReqCreateConfig struct {
	Name                  string       `gorm:"column:name;type:varchar(64)" json:"configame" binding:"required"`
	Format                ConfigFormat `json:"format" binding:"required,oneof=yaml toml ini json conf"` // 格式后缀名(比如: toml, yaml)
	K8SConfigMapId        int          `form:"k8sConfigMapId" binding:"required"`
	K8SConfigMapName      string       `form:"k8sConfigMapName" binding:"required"`
	K8SConfigMapNamespace string       `form:"k8sConfigMapNameSpace" binding:"required"`
}

type ReqListConfig struct {
	K8SConfigMapId        int    `form:"k8sConfigMapId"`
	K8SConfigMapName      string `form:"k8sConfigMapName"`
	K8SConfigMapNamespace string `form:"k8sConfigMapNameSpace"`
}

// RespListConfig ..
type RespListConfig []RespListConfigItem

// RespListConfigItem Does not contain configuration content to prevent configuration from being too long
type RespListConfigItem struct {
	ID          int        `json:"id"`
	AID         int        `json:"aid"`
	Name        string     `json:"name"`
	Format      string     `json:"format"` // Yaml/Toml
	EnvId       int        `json:"envId"`  // 环境id
	ZoneId      int        `json:"zoneId"`
	CreatedAt   time.Time  `json:"created_time"`
	UpdatedAt   time.Time  `json:"update_time"`
	PublishedAt *time.Time `json:"published"` // 未发布/发布时间
}

// ReqDetailConfig ..
type ReqDetailConfig struct {
	ID uint `form:"id" binding:"required"`
}

// RespDetailConfig Contains configuration content
type RespDetailConfig struct {
	ID              int      `json:"id"` // ConfigurationHistory.ID
	AID             int      `json:"aid"`
	Name            string   `json:"name"`
	Content         string   `json:"content"`
	Format          string   `json:"format"` // Yaml/Toml
	EnvId           int      `json:"envId"`  // 环境id
	ZoneId          int      `json:"zoneId"`
	Ctime           int64    `json:"created_time"`
	Utime           int64    `json:"update_time"`
	PublishTime     int64    `json:"publish_time"`      // 未发布/发布时间
	CurrentEditUser *db.User `json:"current_edit_user"` // 当前正在编辑的用户名
}

// ReqUpdateConfig ..
type ReqUpdateConfig struct {
	ID      int    `json:"id" binding:"required"` // the id of configuration
	Message string `json:"message" binding:"required"`
	Content string `json:"content" binding:"required"`
}

// ReqPublishConfig ..
type ReqPublishConfig struct {
	ID      int     `json:"id" binding:"required"` // 配置ID
	Version *string `json:"version"`               // 版本号
}
