package view

type ReqCreateFolder struct {
	Name     string `json:"name" from:"name" binding:"required"`
	Desc     string `json:"desc" from:"desc"`
	ParentId int    `json:"parentId" from:"parentId"`
}
