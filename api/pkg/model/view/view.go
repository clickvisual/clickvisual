package view

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
