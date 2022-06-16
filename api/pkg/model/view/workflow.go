package view

type ReqCreateWorkflow struct {
	Iid int `json:"iid" form:"iid" binding:"required"`
	ReqUpdateSource
}

type ReqUpdateWorkflow struct {
	Name string `json:"name" form:"name" binding:"required"`
	Desc string `json:"desc" form:"desc"`
}

type ReqListWorkflow struct {
	Iid int `json:"iid" form:"iid" binding:"required"`
}
