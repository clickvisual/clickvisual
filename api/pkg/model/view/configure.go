package view

import (
	"github.com/shimohq/mogo/api/pkg/model/db"
)

// ConfigFormat ..
type ConfigFormat string

const (
	ConfigFormatToml       ConfigFormat = "toml"
	ConfigFormatYaml                    = "yaml"
	ConfigFormatJson                    = "json"
	ConfigFormatXml                     = "xml"
	ConfigFormatProperties              = "properties"
	ConfigFormatIni                     = "ini"
	ConfigFormatConf                    = "conf"
)

// ReqCreateConfig ..
type ReqCreateConfig struct {
	Name                  string       `gorm:"column:name;type:varchar(64)" json:"configurationName" binding:"required"`
	Format                ConfigFormat `json:"format" binding:"required,oneof=yaml toml ini json conf"` // 格式后缀名(比如: toml, yaml)
	K8SConfigMapId        int          `form:"k8sConfigMapId"`
	K8SConfigMapName      string       `form:"k8sConfigMapName" binding:"required"`
	K8SConfigMapNamespace string       `form:"k8sConfigMapNameSpace" binding:"required"`
	ClusterId             int          `form:"clusterId" binding:"required"`
}

// ReqSyncConfig ..
type ReqSyncConfig struct {
	K8SConfigMapId        int    `form:"k8sConfigMapId"`
	K8SConfigMapName      string `form:"k8sConfigMapName" binding:"required"`
	K8SConfigMapNamespace string `form:"k8sConfigMapNameSpace" binding:"required"`
	ClusterId             int    `form:"clusterId" binding:"required"`
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
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Format      string `json:"format"`         // Yaml/Toml
	K8SCmId     int    `json:"k8sConfigmapId"` // 环境id
	Ctime       int64  `json:"ctime"`
	Utime       int64  `json:"utime"`
	PublishTime int64  `json:"publishTime"`
}

// ReqDetailConfig ..
type ReqDetailConfig struct {
	ID uint `form:"id" binding:"required"`
}

// RespDetailConfig Contains configuration content
type RespDetailConfig struct {
	ID              int      `json:"id"` // ConfigurationHistory.ID
	ConfigmapId     int      `json:"k8sConfigmapId"`
	Name            string   `json:"name"`
	Content         string   `json:"content"`
	Format          string   `json:"format"` // Yaml/Toml
	EnvId           int      `json:"envId"`  // 环境id
	ZoneId          int      `json:"zoneId"`
	Ctime           int64    `json:"ctime"`
	Utime           int64    `json:"utime"`
	PublishTime     int64    `json:"ptime"`           // 未发布/发布时间
	CurrentEditUser *db.User `json:"currentEditUser"` // 当前正在编辑的用户名
}

// ReqUpdateConfig ..
type ReqUpdateConfig struct {
	ID      int    `json:"id"` // the id of configuration
	Message string `json:"message" binding:"required"`
	Content string `json:"content" binding:"required"`
}

// ReqPublishConfig ..
type ReqPublishConfig struct {
	ID      int     `json:"id"`                         // 配置ID
	Version *string `json:"version" binding:"required"` // 版本号
}

// ConfigMetadata 用于记录某个配置的版本信息
type ConfigMetadata struct {
	Version     string `json:"version"`
	ChangeLog   string `json:"changeLog"`
	PublishedBy int    `json:"uid"`
}

// ReqDiffConfig ..
type ReqDiffConfig struct {
	ID        int `form:"id"`                           // 配置ID
	HistoryID int `form:"historyId" binding:"required"` // 版本ID
}

// RespDiffConfig ..
type RespDiffConfig struct {
	Origin   *RespDetailConfig `json:"origin,omitempty"`
	Modified RespDetailConfig  `json:"modified"`
}

// ReqCreateConfigMap ..
type ReqCreateConfigMap struct {
	ConfigmapName string `form:"configmapName" binding:"required"`
	Namespace     string `form:"namespace" binding:"required"`
}

// ReqConfigMapInfo ..
type ReqConfigMapInfo struct {
	Key string `form:"key" binding:"required"`
}

type RespHistoryConfigItem struct {
	ID              int    `json:"id"`
	UID             int    `json:"uid"` // 发布人ID
	UserName        string `json:"username"`
	ChangeLog       string `json:"changeLog"`
	ConfigurationID int    `json:"configurationId"`
	Version         string `json:"version"` // 发布到Juno Proxy的版本号
	Ctime           int64  `json:"ctime"`
}
