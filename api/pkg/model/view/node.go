package view

type RepCreateNode struct {
	Primary   int    `json:"primary" from:"primary" binding:"required"`     // 1 offline 2 realtime 3 short
	Secondary int    `json:"secondary" from:"secondary" binding:"required"` // 1 数据库
	Tertiary  int    `json:"tertiary" from:"tertiary" binding:"required"`   // 1 clickhouse
	Iid       int    `json:"Iid" from:"Iid" binding:"required"`
	FolderID  int    `json:"folderID" from:"folderID" binding:"required"`
	Name      string `json:"name" from:"name" binding:"required"`
	Desc      string `json:"desc" from:"desc"`
	Content   string `json:"content" from:"content" binding:"required"`
}

type ReqListNode struct {
	Iid      int `json:"Iid" from:"Iid" binding:"required"`
	FolderID int `json:"folderID" from:"folderID"`
}

type RespListNode struct {
	FolderID int    `json:"folderID"`
	Name     string `json:"name"`
	Desc     string `json:"desc"`
	Uid      int    `json:"uid"`
	UserName string `json:"userName"`
}
