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
	Name     string `json:"name" form:"name" binding:"required"`
	Desc     string `json:"desc" form:"desc"`
	ParentId int    `json:"parentId" form:"parentId"`
}

type RespListFolder struct {
	Id       int               `json:"id"`
	Name     string            `json:"name"`
	Desc     string            `json:"desc"`
	ParentId int               `json:"parentId"`
	Children []RespListFolder  `json:"children"`
	Nodes    []*db.BigdataNode `json:"nodes"`
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

// ReqCreateIntegration integration views
type (
	ReqCreateIntegration struct {
		Typ int `json:"typ" form:"typ" binding:"required"`
		ReqUpdateIntegration
	}

	ReqUpdateIntegration struct {
		Source  string `json:"source" form:"source" binding:"required"`
		Target  string `json:"target" form:"target" binding:"required"`
		Mapping string `json:"mapping" form:"mapping" binding:"required"`
	}

	// IntegrationFlat integration offline sync step 1
	IntegrationFlat struct {
		Database string `json:"database"`
		Table    string `json:"table"`

		SourceFilter string `json:"filter"`

		TargetPre             string `json:"targetPre"`
		TargetPost            string `json:"TargetPost"`
		TargetPrimaryConflict int    `json:"targetPrimaryConflict"`
	}

	IntegrationFlatMySQL struct {
		IntegrationFlat
	}

	IntegrationFlatClickHouse struct {
		IntegrationFlat
		TargetBatchSize int `json:"targetBatchSize"`
		TargetBatchNum  int `json:"TargetBatchNum"`
	}

	// IntegrationMapping integration offline sync step 2
	IntegrationMapping struct {
		Source     string `json:"source"`
		SourceType string `json:"sourceType"`
		Target     string `json:"target"`
		TargetType string `json:"targetType"`
	}
)

type (
	// ReqCreateNode Node
	ReqCreateNode struct {
		Primary    int `json:"primary" form:"primary" binding:"required"`     // 1 offline 2 realtime 3 short
		Secondary  int `json:"secondary" form:"secondary" binding:"required"` // 1 数据库
		Tertiary   int `json:"tertiary" form:"tertiary" binding:"required"`   // 1 clickhouse
		Iid        int `json:"iid" form:"iid" binding:"required"`
		WorkflowId int `json:"workflowId" form:"workflowId"`
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
)
