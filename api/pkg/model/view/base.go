package view

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type ReqDatabaseCreate struct {
	Name    string `json:"databaseName" form:"databaseName"`
	Cluster string `json:"cluster" form:"cluster"`
	Desc    string `json:"desc" form:"desc"`
}

type RespDatabaseItem struct {
	Id             int      `json:"id"`   // id
	Iid            int      `json:"iid"`  // 实例 id
	Name           string   `json:"name"` // 数据库名称
	Uid            int      `json:"uid"`  // 操作人
	DatasourceType string   `json:"datasourceType"`
	InstanceName   string   `json:"instanceName"`
	InstanceDesc   string   `json:"instanceDesc"`
	Mode           int      `json:"mode"`
	Clusters       []string `json:"clusters"`
	Desc           string   `json:"desc"`
}

type HiddenFieldCreate struct {
	Fields []string `json:"fields" binding:"required"`
}

type ReqCreateIndex struct {
	Tid  int         `json:"tid" form:"tid"`
	Data []IndexItem `json:"data"`
}

type IndexItem struct {
	Field    string `json:"field" form:"field"`
	Alias    string `json:"alias" form:"alias"`
	Typ      int    `json:"typ" form:"typ"`
	RootName string `json:"rootName" form:"rootName"`
	HashTyp  int    `json:"hashTyp" form:"hashTyp"`
}

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
	Keys          []*db.BaseIndex          `json:"keys"`
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

type ReqTemplateStandalone struct {
	Dsn         string `json:"dsn" binding:"required"`
	ClusterName string `json:"clusterName" binding:"required"`
	Brokers     string `json:"brokers" binding:"required"`
}

type ReqTemplateClusterNoReplica struct {
	Dsn                 string `json:"dsn" binding:"required"`
	K8sClusterName      string `json:"k8sClusterName" binding:"required"`
	Brokers             string `json:"brokers" binding:"required"`
	InstanceClusterName string `json:"instanceClusterName" binding:"required"`
}

type ReqTableCreateExist struct {
	DatabaseName  string `form:"databaseName" json:"databaseName" binding:"required"`
	TableName     string `form:"tableName" json:"tableName" binding:"required"`
	TimeField     string `form:"timeField" json:"timeField"`
	TimeFieldType int    `form:"timeFieldType" json:"timeFieldType"`
	Desc          string `form:"desc" json:"desc"`
}

type ReqTableCreateExistBatch struct {
	TableList []ReqTableCreateExist `form:"tableList" json:"tableList"`
}

type ReqTableUpdate struct {
	Desc string `form:"desc"`
}

type ReqTableCreate struct {
	TableName string `form:"tableName" binding:"required"`
	Typ       int    `form:"typ" binding:"required"`
	Days      int    `form:"days" binding:"required"`
	Brokers   string `form:"brokers" binding:"required"`
	Topics    string `form:"topics" binding:"required"`
	Consumers int    `form:"consumers" binding:"required"`
	Desc      string `form:"desc"`
}

type ReqTableId struct {
	Instance   string `form:"instance" binding:"required"`
	Database   string `form:"database" binding:"required"`
	Table      string `form:"table" binding:"required"`
	Datasource string `form:"datasource" binding:"required"`
}

type RespTableSimple struct {
	Id         int    `json:"id"`
	TableName  string `json:"tableName"`
	CreateType int    `json:"createType"`
	Desc       string `json:"desc"`
}

type RespTableDetail struct {
	Did        int    `json:"did"`     // 数据库 id
	Name       string `json:"name"`    // table
	Typ        int    `json:"typ"`     // table 类型 1 app 2 ego 3 ingress
	Days       int    `json:"days"`    // 数据过期时间
	Brokers    string `json:"brokers"` // kafka broker
	Topic      string `json:"topic"`   // kafka topic
	Uid        int    `json:"uid"`     // 操作人
	Desc       string `json:"desc"`    //
	SQLContent struct {
		Keys []string          `json:"keys"`
		Data map[string]string `json:"data"`
	} `json:"sqlContent"`
	Database   RespDatabaseItem `json:"database"`
	CreateType int              `json:"createType"`
	TimeField  string           `json:"timeField"`
	Ctime      int64            `json:"ctime"`
	Utime      int64            `json:"utime"`
}

type RespColumn struct {
	Name     string `json:"name"`
	TypeDesc string `json:"typeDesc"`
	Type     int    `json:"type"`
}

type RespDatabaseSelfBuilt struct {
	Name   string                 `json:"name"`
	Tables []*RespTablesSelfBuilt `json:"tables"`
}

type RespTablesSelfBuilt struct {
	Name string `json:"name"`
}

type RespTableDeps struct {
	Database   string   `json:"database"`
	Table      string   `json:"table"`
	Engine     string   `json:"engine"`
	TotalRows  uint64   `json:"totalRows"`
	TotalBytes uint64   `json:"totalBytes"`
	Deps       []string `json:"deps"`
}

type ReqViewCreate struct {
	Name             string `json:"viewName"`
	IsUseDefaultTime int    `json:"isUseDefaultTime"`
	Key              string `json:"key"`
	Format           string `json:"format"`
}

type ReqViewList struct {
	ID   int    `json:"id"`
	Name string `json:"viewName"`
}
