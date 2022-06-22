package view

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type ReqCreateFolder struct {
	Iid       int `json:"iid" form:"iid" binding:"required"`
	Primary   int `json:"primary" form:"primary" binding:"required"`
	Secondary int `json:"secondary" form:"secondary"`

	ReqUpdateFolder
}

type ReqUpdateFolder struct {
	Name       string `json:"name" form:"name" binding:"required"`
	Desc       string `json:"desc" form:"desc"`
	ParentId   int    `json:"parentId" form:"parentId"`
	WorkflowId int    `json:"workflowId" form:"workflowId"`
}

type RespListFolder struct {
	Id        int               `json:"id"`
	Name      string            `json:"name"`
	Desc      string            `json:"desc"`
	Primary   int               `json:"primary"`
	Secondary int               `json:"secondary"`
	ParentId  int               `json:"parentId"`
	Children  []RespListFolder  `json:"children"`
	Nodes     []*db.BigdataNode `json:"nodes"`
}

type RespInfoFolder struct {
	db.BigdataFolder
	UserName string `json:"userName"`
	NickName string `json:"nickName"`
}

type ReqCreateSource struct {
	Iid int `json:"iid" form:"iid" binding:"required"`
	ReqUpdateSource
}

type ReqUpdateSource struct {
	Name     string `json:"name" form:"name" binding:"required"`
	Desc     string `json:"desc" form:"desc"`
	URL      string `json:"url" form:"url"`
	UserName string `json:"username" form:"username"`
	Password string `json:"password" form:"password"`
	Typ      int    `json:"typ" form:"typ"`
}

type ReqListSource struct {
	Iid  int    `json:"iid" form:"iid" binding:"required"`
	Typ  int    `json:"typ" form:"typ"`
	Name string `json:"name" form:"name"`
}

type ReqListSourceTable struct {
	Database string `json:"database" form:"database" binding:"required"`
}

type ReqListSourceColumn struct {
	Database string `json:"database" form:"database" binding:"required"`
	Table    string `json:"table" form:"table" binding:"required"`
}

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

type (
	// ReqCreateNode Node
	ReqCreateNode struct {
		Primary    int `json:"primary" form:"primary" binding:"required"`     // 1 offline 2 realtime 3 short
		Secondary  int `json:"secondary" form:"secondary" binding:"required"` // 1 数据库
		Tertiary   int `json:"tertiary" form:"tertiary" binding:"required"`   // 1 clickhouse
		Iid        int `json:"iid" form:"iid" binding:"required"`
		WorkflowId int `json:"workflowId" form:"workflowId"`
		SourceId   int `json:"sourceId" form:"sourceId"`
		ReqUpdateNode
	}

	ReqUpdateNode struct {
		FolderId int    `json:"folderId" form:"folderId"`
		Name     string `json:"name" form:"name"`
		Desc     string `json:"desc" form:"desc"`
		Content  string `json:"content" form:"content"`
	}

	RespCreateNode struct {
		Id      int    `json:"id"`
		Name    string `json:"name"`
		Desc    string `json:"desc"`
		Content string `json:"content"`
		LockUid int    `json:"lockUid"`
		LockAt  int64  `json:"lockAt"`
	}

	ReqListNode struct {
		Iid        int `json:"iid" form:"iid"  binding:"required"`
		Primary    int `json:"primary" form:"primary" binding:"required"`
		Secondary  int `json:"secondary" form:"secondary"`
		FolderId   int `json:"folderId" form:"folderId"`
		WorkflowId int `json:"workflowId" form:"workflowId"`
	}

	RespListNode struct {
		FolderId int    `json:"folderId"`
		Name     string `json:"name"`
		Desc     string `json:"desc"`
		Uid      int    `json:"uid"`
		UserName string `json:"userName"`
	}

	RespInfoNode struct {
		Id       int    `json:"id"`
		Name     string `json:"name"`
		Desc     string `json:"desc"`
		Content  string `json:"content"`
		LockUid  int    `json:"lockUid"`
		LockAt   int64  `json:"lockAt"`
		Username string `json:"username"`
		Nickname string `json:"nickname"`
	}

	RespRunNodeStatus struct {
		Id        int                     `json:"id"`
		Status    int                     `json:"status"`
		Current   *db.BigdataNodeStatus   `json:"current"`
		Histories []*db.BigdataNodeStatus `json:"histories"`
	}

	RespRunNode struct {
		Logs []map[string]interface{} `json:"logs"`
	}

	OfflineContent struct {
		Source  IntegrationFlat    `json:"source"`
		Target  IntegrationFlat    `json:"target"`
		Mapping IntegrationMapping `json:"mapping"`
		Setting IntegrationSetting `json:"setting"`
	}
	// IntegrationFlat integration offline sync step 1
	IntegrationFlat struct {
		Typ      string `json:"typ"` // clickhouse mysql
		Id       string `json:"id"`
		Database string `json:"database"`
		Table    string `json:"table"`

		SourceFilter       string `json:"sourceFilter"`
		SourceTimeField    string `json:"SourceTimeField"`
		SourceTimeFieldTyp int    `json:"SourceTimeFieldTyp"` // 1 int 2 time.Time

		TargetPre             string `json:"targetPre"`
		TargetPost            string `json:"targetPost"`
		TargetPrimaryConflict int    `json:"targetPrimaryConflict"`
		TargetBatchSize       int    `json:"targetBatchSize"`
		TargetBatchNum        int    `json:"targetBatchNum"`
	}
	// IntegrationMapping integration offline sync step 2
	IntegrationMapping struct {
		Source     string `json:"source"`
		SourceType string `json:"sourceType"`
		Target     string `json:"target"`
		TargetType string `json:"targetType"`
	}

	IntegrationSetting struct {
		Cron string `json:"cron"`
	}

	InnerNodeRun struct {
		N  *db.BigdataNode
		NC *db.BigdataNodeContent
	}
)
