package view

type ReqCreateNode struct {
	Primary   int `json:"primary" form:"primary" binding:"required"`     // 1 offline 2 realtime 3 short
	Secondary int `json:"secondary" form:"secondary" binding:"required"` // 1 数据库
	Tertiary  int `json:"tertiary" form:"tertiary" binding:"required"`   // 1 clickhouse
	Iid       int `json:"iid" form:"iid" binding:"required"`
	ReqUpdateNode
}

type ReqUpdateNode struct {
	FolderId int    `json:"folderId" form:"folderId"`
	Name     string `json:"name" form:"name"`
	Desc     string `json:"desc" form:"desc"`
	Content  string `json:"content" form:"content"`
}

type RespCreateNode struct {
	Id      int    `json:"id"`
	Name    string `json:"name"`
	Desc    string `json:"desc"`
	Content string `json:"content"`
	LockUid int    `json:"lockUid"`
	LockAt  int64  `json:"lockAt"`
}

type ReqListNode struct {
	Iid      int `json:"iid" form:"iid" binding:"required"`
	FolderId int `json:"folderId" form:"folderId"`
}

type RespListNode struct {
	FolderId int    `json:"folderId"`
	Name     string `json:"name"`
	Desc     string `json:"desc"`
	Uid      int    `json:"uid"`
	UserName string `json:"userName"`
}

type RespInfoNode struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Desc     string `json:"desc"`
	Content  string `json:"content"`
	LockUid  int    `json:"lockUid"`
	LockAt   int64  `json:"lockAt"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
}
