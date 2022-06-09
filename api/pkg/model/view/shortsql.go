package view

type RepCreateShortSQL struct {
	FolderID int    `json:"folderID" from:"folderID" binding:"required"`
	Name     string `json:"name" from:"name" binding:"required"`
	Desc     string `json:"desc" from:"desc"`
	Content  string `json:"content" from:"content" binding:"required"`
}

type ReqListShortSQL struct {
	FolderID int `json:"folderID" from:"folderID"`
}
