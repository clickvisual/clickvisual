package db

import (
	"time"

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
	SecondaryDashboard       = 4
)

const (
	TertiaryClickHouse   = 10
	TertiaryMySQL        = 11
	TertiaryOfflineSync  = 20
	TertiaryRealTimeSync = 21
)

// 0 No status 2 Executing 3 Abnormal execution 4 Completed
const (
	NodeStatusDefault = 0
	NodeStatusHandler = 2
	NodeStatusError   = 3
	NodeStatusFinish  = 4
)

func (m *BigdataNode) TableName() string {
	return TableNameBigDataNode
}

func (m *BigdataNodeContent) TableName() string {
	return TableNameBigDataNodeContent
}

func (m *BigdataNodeHistory) TableName() string {
	return TableNameBigDataNodeHistory
}

func (m *BigdataNodeResult) TableName() string {
	return TableNameBigDataNodeResult
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
		UUID       string `gorm:"column:uuid;type:varchar(128)" json:"uuid"`
	}

	BigdataNodeContent struct {
		NodeId          int    `gorm:"column:node_id;type:int(11);uix_node_id,unique" json:"nodeId"`
		Content         string `gorm:"column:content;type:longtext" json:"content"`
		Result          string `gorm:"column:result;type:longtext" json:"result"`
		PreviousContent string `gorm:"column:previous_content;type:longtext" json:"PreviousContent"`
		Utime           int64  `gorm:"bigint;autoUpdateTime;comment:update time" json:"utime"`
	}

	BigdataNodeHistory struct {
		UUID    string `gorm:"column:uuid;type:varchar(128);uix_uuid,unique" json:"uuid"`
		NodeId  int    `gorm:"column:node_id;type:int(11)" json:"nodeId"`
		Content string `gorm:"column:content;type:longtext" json:"content"`
		Uid     int    `gorm:"column:uid;type:int(11)" json:"uid"`
		Utime   int64  `gorm:"bigint;autoUpdateTime;comment:update time" json:"utime"`
	}

	BigdataNodeResult struct {
		BaseModel

		NodeId  int    `gorm:"column:node_id;type:int(11)" json:"nodeId"`
		Content string `gorm:"column:content;type:longtext" json:"content"`
		Result  string `gorm:"column:result;type:longtext" json:"result"`
		Uid     int    `gorm:"column:uid;type:int(11)" json:"uid"`
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
	db := invoker.Db.Select("uuid, utime, uid").Model(BigdataNodeHistory{}).Where(sql, binds...).Order("utime desc")
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

func NodeResultInfo(db *gorm.DB, id int) (resp BigdataNodeResult, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeResult{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func NodeResultList(conds egorm.Conds) (resp []*BigdataNodeResult, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataNodeResult{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func NodeResultCreate(db *gorm.DB, data *BigdataNodeResult) (err error) {
	if err = db.Model(BigdataNodeResult{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func NodeResultUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeResult{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func NodeResultDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataNodeResult{}).Delete(&BigdataNodeResult{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

func NodeResultDelete30Days() {
	expire := time.Hour * 24 * 30
	if err := invoker.Db.Model(BigdataNodeResult{}).Where("ctime<?", time.Now().Add(-expire).Unix()).Unscoped().Delete(&BigdataNodeResult{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
}

func NodeResultListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*BigdataNodeResult) {
	respList = make([]*BigdataNodeResult, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Select("id, ctime, uid").Model(BigdataNodeResult{}).Where(sql, binds...).Order("id desc")
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}
