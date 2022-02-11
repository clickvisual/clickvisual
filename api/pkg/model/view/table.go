package view

type ReqTableCreate struct {
	TableName string `form:"tableName" binding:"required"`
	Typ       int    `form:"typ" binding:"required"`
	Days      int    `form:"days" binding:"required"`
	Brokers   string `form:"brokers" binding:"required"`
	Topics    string `form:"topics" binding:"required"`
}

type ReqTableId struct {
	Instance   string `form:"instance" binding:"required"`
	Database   string `form:"database" binding:"required"`
	Table      string `form:"table" binding:"required"`
	Datasource string `form:"datasource" binding:"required"`
}

type RespTableSimple struct {
	Id        int    `json:"id"`
	TableName string `json:"tableName"`
}

type RespTableDetail struct {
	Did        int    `json:"did"`     // 数据库 id
	Name       string `json:"name"`    // table
	Typ        int    `json:"typ"`     // table 类型 1 app 2 ego 3 ingress
	Days       int    `json:"days"`    // 数据过期时间
	Brokers    string `json:"brokers"` // kafka broker
	Topic      string `json:"topic"`   // kafka topic
	Uid        int    `json:"uid"`     // 操作人
	SQLContent struct {
		Keys []string          `json:"keys"`
		Data map[string]string `json:"data"`
	} `json:"sqlContent"`
	Database RespDatabaseItem `json:"database"`
}
