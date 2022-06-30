package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	PrimaryMining = 1
	PrimaryShort  = 3
)

const (
	SecondaryAny             = 0
	SecondaryDatabase        = 1
	SecondaryDataIntegration = 2
	SecondaryDataMining      = 3
)

const (
	TertiaryClickHouse   = 10
	TertiaryMySQL        = 11
	TertiaryOfflineSync  = 20
	TertiaryRealTimeSync = 21
)

const (
	NodeStatusDefault int = iota
	NodeStatusWaitCron
	NodeStatusWaitHandler
	NodeStatusHandler
	NodeStatusError
	NodeStatusFinish
)

func (m *BigdataNode) TableName() string {
	return TableNameBigDataNode
}

func (m *BigdataNodeContent) TableName() string {
	return TableNameBigDataNodeContent
}

func (m *BigdataNodeStatus) TableName() string {
	return TableNameBigDataNodeStatus
}

func (m *BigdataNodeHistory) TableName() string {
	return TableNameBigDataNodeHistory
}

type (
	BigdataNode struct {
		BaseModel

		Uid        int    `gorm:"column:uid;type:int(11)" json:"uid"`
		Iid        int    `gorm:"column:iid;type:int(11)" json:"iid"`
		FolderID   int    `gorm:"column:folder_id;type:int(11)" json:"folderId"`
		Primary    int    `gorm:"column:primary;type:int(11)" json:"primary"`
		Secondary  int    `gorm:"column:secondary;type:int(11)" json:"secondary"`
		Tertiary   int    `gorm:"column:tertiary;type:int(11)" json:"tertiary"`
		WorkflowId int    `gorm:"column:workflow_id;type:int(11)" json:"workflowId"`
		SourceId   int    `gorm:"column:sourceId;type:int(11)" json:"sourceId"`
		Name       string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
		Desc       string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"`
		LockUid    int    `gorm:"column:lock_uid;type:int(11) unsigned" json:"lockUid"`
		LockAt     int64  `gorm:"column:lock_at;type:int(11)" json:"lockAt"`
		Status     int    `gorm:"column:status;type:int(11)" json:"status"` // 0 无状态 1 待执行 2 执行中 3 执行异常 4 执行完成
		UUID       string `gorm:"column:uuid;type:string" json:"uuid"`
		Rtime      int64  `gorm:"column:rtime;type:bigint;comment:run time" json:"rtime"`
	}

	BigdataNodeContent struct {
		NodeId  int    `gorm:"column:node_id;type:int(11);uix_node_id,unique" json:"nodeId"`
		Content string `gorm:"column:content;type:longtext" json:"content"`
		Result  string `gorm:"column:result;type:longtext" json:"result"`
	}

	BigdataNodeStatus struct {
		BaseModel

		NodeId  int    `gorm:"column:node_id;type:int(11)" json:"nodeId"`
		Total   int    `gorm:"column:total;type:int(11) unsigned" json:"total"`
		Handled int    `gorm:"column:handled;type:int(11) unsigned" json:"handled"`
		Reason  string `gorm:"column:reason;type:text" json:"reason"`
	}

	BigdataNodeHistory struct {
		UUID    string `gorm:"column:uuid;type:string;uix_uuid,unique" json:"uuid"`
		NodeId  int    `gorm:"column:node_id;type:int(11)" json:"nodeId"`
		Content string `gorm:"column:content;type:longtext" json:"content"`
		Utime   int64  `gorm:"bigint;autoUpdateTime;comment:update time" json:"utime"`
	}
)

func NodeInfo(db *gorm.DB, id int) (resp BigdataNode, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNode{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func NodeList(conds egorm.Conds) (resp []*BigdataNode, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataNode{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func NodeCreate(db *gorm.DB, data *BigdataNode) (err error) {
	if err = db.Model(BigdataNode{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func NodeUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNode{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func NodeDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataNode{}).Delete(&BigdataNode{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

func NodeContentInfo(db *gorm.DB, id int) (resp BigdataNodeContent, err error) {
	var sql = "`node_id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeContent{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func NodeContentCreate(db *gorm.DB, data *BigdataNodeContent) (err error) {
	if err = db.Model(BigdataNodeContent{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func NodeContentUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`node_id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeContent{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func NodeContentDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataNodeContent{}).Where("node_id=?", id).Unscoped().Delete(&BigdataNodeContent{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

func NodeStatusInfo(db *gorm.DB, id int) (resp BigdataNodeStatus, err error) {
	var sql = "`node_id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeStatus{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func NodeStatusCreate(db *gorm.DB, data *BigdataNodeStatus) (err error) {
	if err = db.Model(BigdataNodeStatus{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func NodeStatusUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeStatus{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

// NodeStatusListPage return item list by pagination
func NodeStatusListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*BigdataNodeStatus) {
	respList = make([]*BigdataNodeStatus, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Model(BigdataNodeStatus{}).Where(sql, binds...).Order("id desc")
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func NodeHistoryInfo(db *gorm.DB, uuid string) (resp BigdataNodeHistory, err error) {
	var sql = "`uuid`= ?"
	var binds = []interface{}{uuid}
	if err = db.Model(BigdataNodeHistory{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func NodeHistoryListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*BigdataNodeHistory) {
	respList = make([]*BigdataNodeHistory, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Select("uuid, utime").Model(BigdataNodeHistory{}).Where(sql, binds...).Order("utime desc")
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func NodeHistoryCreate(db *gorm.DB, data *BigdataNodeHistory) (err error) {
	if err = db.Model(BigdataNodeHistory{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}
