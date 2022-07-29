package view

type ReqKafkaJSONMapping struct {
	Data string `json:"data" form:"data"`
}

type ReqStorageCreate struct {
	TableName string `form:"tableName" binding:"required"`
	Typ       int    `form:"typ" binding:"required"` // 1 string 2 float
	Days      int    `form:"days" binding:"required"`
	Brokers   string `form:"brokers" binding:"required"`
	Topics    string `form:"topics" binding:"required"`
	Consumers int    `form:"consumers" binding:"required"`
	Desc      string `form:"desc"`
	// v2
	DatabaseId    int             `json:"databaseId" form:"databaseId" binding:"required"`
	SourceMapping []MappingStruct `form:"sourceMapping" binding:"required"`
	TimeField     string          `form:"timeField" binding:"required"`
	RawLogField   string          `form:"rawLogField" binding:"required"`
}

type MappingStruct struct {
	Data []MappingStructItem `json:"data"`
}

type MappingStructItem struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
