package view

type ReqCreateIndex struct {
	InstanceID int         `json:"instanceId" form:"instanceId" binding:"required"`
	Database   string      `json:"database" form:"database" binding:"required"`
	Table      string      `json:"table" form:"table" binding:"required"`
	Data       []IndexItem `json:"data"`
}

type IndexItem struct {
	Field string `json:"field" form:"field"`
	Alias string `json:"alias" form:"alias"`
	Typ   int    `json:"typ" form:"typ"`
}
