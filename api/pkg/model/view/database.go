package view

type ReqDatabaseCreate struct {
	Name string `json:"databaseName" form:"databaseName"`
}
