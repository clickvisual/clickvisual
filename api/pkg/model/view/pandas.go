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
		Primary    int `json:"primary" form:"primary" binding:"required"`
		Secondary  int `json:"secondary" form:"secondary" binding:"required"`
		Tertiary   int `json:"tertiary" form:"tertiary"`
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
		SourceId int    `json:"sourceId" form:"sourceId"`
		Tertiary int    `json:"tertiary" form:"tertiary"`
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
		Id              int    `json:"id"`
		Name            string `json:"name"`
		Desc            string `json:"desc"`
		Content         string `json:"content"`
		LockUid         int    `json:"lockUid"`
		LockAt          int64  `json:"lockAt"`
		Username        string `json:"username"`
		Nickname        string `json:"nickname"`
		Status          int    `json:"status"`
		PreviousContent string `json:"previousContent"`
		Result          string `json:"result"`
	}

	// RespRunNodeStatus struct {
	// 	Id        int                     `json:"id"`
	// 	Status    int                     `json:"status"`
	// 	Current   *db.BigdataNodeStatus   `json:"current"`
	// 	Histories []*db.BigdataNodeStatus `json:"histories"`
	// }

	RunNodeResult struct {
		Logs           []map[string]interface{} `json:"logs"`
		InvolvedSQLs   map[string]string        `json:"involvedSQLs"`
		Message        string                   `json:"message"`
		DagFailedNodes map[int]string           `json:"dagFailedNodes"`
	}

	RespRunNode struct {
		Result string `json:"result"`
		Status int    `json:"status"`
	}

	SyncContent struct {
		Source  IntegrationFlat      `json:"source"`
		Target  IntegrationFlat      `json:"target"`
		Mapping []IntegrationMapping `json:"mapping"`
	}
	// IntegrationFlat integration offline sync step 1
	IntegrationFlat struct {
		Typ      string `json:"typ"` // clickhouse mysql
		SourceId int    `json:"sourceId"`
		Cluster  string `json:"cluster"`
		Database string `json:"database"`
		Table    string `json:"table"`

		SourceFilter string `json:"sourceFilter"`

		TargetBefore string `json:"targetBefore"`
		TargetAfter  string `json:"targetAfter"`
	}
	// IntegrationMapping integration offline sync step 2
	IntegrationMapping struct {
		Source     string `json:"source"`
		SourceType string `json:"sourceType"`
		Target     string `json:"target"`
		TargetType string `json:"targetType"`
	}

	InnerNodeRun struct {
		N  *db.BigdataNode
		NC *db.BigdataNodeContent
	}

	ReqNodeRunOpenAPI struct {
		Token string `json:"token" form:"token" binding:"required"`
	}

	ReqNodeHistoryList struct {
		db.ReqPage
	}

	NodeHistoryItem struct {
		UUID     string `json:"uuid"`
		Utime    int64  `json:"utime"`
		Uid      int    `json:"uid"`
		UserName string `json:"userName"`
		Nickname string `json:"nickname"`
	}

	RespNodeHistoryList struct {
		Total int64             `json:"total"`
		List  []NodeHistoryItem `json:"list"`
	}

	ReqNodeResultList struct {
		db.ReqPage
	}

	RespNodeResult struct {
		ID      int    `json:"id"`
		Ctime   int64  `json:"ctime"`
		NodeId  int    `json:"nodeId"`
		Content string `json:"content,omitempty"`
		Result  string `json:"result,omitempty"`
		RespUserSimpleInfo
	}

	RespNodeResultList struct {
		Total int64            `json:"total"`
		List  []RespNodeResult `json:"list"`
	}
)

func (s *SyncContent) Cluster() string {
	if s.Target.Typ == "clickhouse" {
		return s.Target.Cluster
	}
	if s.Source.Typ == "clickhouse" {
		return s.Source.Cluster
	}
	return ""
}

// crontab struct
type (
	ReqCreateCrontab struct {
		ReqUpdateCrontab
	}
	ReqUpdateCrontab struct {
		Desc          string          `json:"desc" from:"desc"`
		DutyUid       int             `json:"dutyUid" from:"dutyUid"`
		Cron          string          `json:"cron" from:"cron"`
		Typ           int             `json:"typ" from:"typ"`
		Args          []ReqCrontabArg `json:"args" from:"args"`
		IsRetry       int             `json:"isRetry" from:"isRetry"`
		RetryTimes    int             `json:"retryTimes" from:"retryTimes"`
		RetryInterval int             `json:"retryInterval" from:"retryInterval"`
	}
	ReqCrontabArg struct {
		Key string `json:"key" from:"key"`
		Val string `json:"val" from:"val"`
	}
	ReqNodeRunResult struct {
		ExcelProcess string `json:"excelProcess" from:"excelProcess"`
	}
)

// DAG ...
type (
	ReqDAG struct {
		BoardNodeList []ReqDagNode `json:"boardNodeList"`
		BoardEdges    []ReqDagEdge `json:"boardEdges"`
	}
	ReqDagNode struct {
		Id int `json:"id"` // node id
	}
	ReqDagEdge struct {
		Source string `json:"source"`
		Target string `json:"target"`
	}
	DagExecFlow struct {
		NodeId   int           `json:"nodeId"`
		Children []DagExecFlow `json:"children"`
	}
)
