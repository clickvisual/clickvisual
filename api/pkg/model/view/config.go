package view

import (
	"time"
)

// ConfigFormat ..
type ConfigFormat string

// ReqCreateConfig ..
type ReqCreateConfig struct {
	Aid      int          `json:"aid" binding:"required"`
	EnvId    int          `json:"envId" binding:"required"` // 环境id
	ZoneId   int          `json:"zoneId" binding:"required"`
	FileName string       `json:"file_name" binding:"required"`                            // 文件名(不带后缀)
	Format   ConfigFormat `json:"format" binding:"required,oneof=yaml toml ini json conf"` // 格式后缀名(比如: toml, yaml)
}

type ReqListConfig struct {
	Aid    int `form:"aid" binding:"required"`
	EnvId  int `form:"envId" binding:"required"`
	ZoneId int `form:"zoneId" binding:"required"`
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
