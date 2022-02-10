package view

type ReqDatabaseCreate struct {
	Name string `json:"databaseName" form:"databaseName"`
}

type RespDatabaseItem struct {
	Id             int    `json:"id"`   // id
	Iid            int    `json:"iid"`  // 实例 id
	Name           string `json:"name"` // 数据库名称
	Uid            int    `json:"uid"`  // 操作人
	DatasourceType string `json:"datasourceType"`
}
