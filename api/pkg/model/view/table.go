package view

type ReqTableCreate struct {
	TableName string `form:"tableName" binding:"required"`
	Typ       int    `form:"typ" binding:"required"`
	Days      int    `form:"days" binding:"required"`
	Brokers   string `form:"brokers" binding:"required"`
	Topics    string `form:"topics" binding:"required"`
}

type RespTableSimple struct {
	Id        int    `json:"id"`
	TableName string `json:"tableName"`
}
