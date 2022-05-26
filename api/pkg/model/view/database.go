package view

type ReqDatabaseCreate struct {
	Name    string `json:"databaseName" form:"databaseName"`
	Cluster string `json:"cluster" from:"cluster"`
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
