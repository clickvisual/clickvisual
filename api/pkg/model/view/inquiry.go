package view

import (
	"github.com/shimohq/mogo/api/pkg/model/db"
)

type ReqQuery struct {
	Tid           int    `json:"tid" form:"tid"`
	Database      string `form:"database"`
	Table         string `form:"table"`
	DatabaseTable string `form:"databaseTable"`
	Field         string `form:"field"`
	Query         string `form:"query"`
	TimeField     string `form:"timeField"`
	TimeFieldType int    `form:"timeFieldType"`
	ST            int64  `form:"st"`
	ET            int64  `form:"et"`
	Page          uint32 `form:"page"`
	PageSize      uint32 `form:"pageSize"`
}

type RespQuery struct {
	Limited       uint32                   `json:"limited"`
	Keys          []*db.Index              `json:"keys"`
	ShowKeys      []string                 `json:"showKeys"`
	Count         uint64                   `json:"count"`
	Terms         [][]string               `json:"terms"`
	HiddenFields  []string                 `json:"hiddenFields"`
	DefaultFields []string                 `json:"defaultFields"`
	Logs          []map[string]interface{} `json:"logs"`
	Query         string                   `json:"query"`
}

type ReqComplete struct {
	Query string `form:"query" binding:"required"`
}

type RespComplete struct {
	Logs []map[string]interface{} `json:"logs"`
}

type HighCharts struct {
	Histograms []HighChart `json:"histograms"`
	Count      uint64      `json:"count"`
	Progress   string      `json:"progress"`
}

type HighChart struct {
	Count    uint64 `json:"count"`
	Progress string `json:"progress"`
	From     int64  `json:"from"`
	To       int64  `json:"to"`
}

type RespDatabase struct {
	DatabaseName   string `json:"databaseName"`
	InstanceName   string `json:"instanceName"`
	DatasourceType string `json:"datasourceType"`
	InstanceId     int    `json:"instanceId"`
}

type RespIndexItem struct {
	IndexName string  `json:"indexName"`
	Count     uint64  `json:"count"`
	Percent   float64 `json:"percent"`
}
