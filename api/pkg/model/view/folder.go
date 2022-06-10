package view

type ReqCreateFolder struct {
	Iid      int    `json:"iid" from:"iid" binding:"required"`
	Name     string `json:"name" from:"name" binding:"required"`
	Desc     string `json:"desc" from:"desc"`
	ParentId int    `json:"parentId" from:"parentId"`
}

type ReqListFolder struct {
	Iid int `json:"iid" from:"iid"  binding:"required"`
}
