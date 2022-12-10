package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	_ int = iota
	CrontabTypSuspended
)

const (
	CrontabStatusWait int = iota
	CrontabStatusPreempt
	CrontabStatusDoing
)

const (
	SourceTypMySQL      = 1
	SourceTypClickHouse = 2
	SourceDatabend      = 3
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

func (m *BigdataWorkflow) TableName() string {
	return TableNameBigDataWorkflow
}

func (m *BigdataSource) TableName() string {
	return TableNameBigDataSource
}

func (m *BigdataNode) TableName() string {
	return TableNameBigDataNode
}

func (m *BigdataNodeContent) TableName() string {
	return TableNameBigDataNodeContent
}

func (m *BigdataNodeHistory) TableName() string {
	return TableNameBigDataNodeHistory
}

func (m *BigdataFolder) TableName() string {
	return TableNameBigDataFolder
}

type BigdataFolder struct {
	BaseModel

	Uid        int    `gorm:"column:uid;type:int(11)" json:"uid"` // uid of alarm operator
	Iid        int    `gorm:"column:iid;type:int(11)" json:"iid"`
	Name       string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // name of an alarm
	Desc       string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	Primary    int    `gorm:"column:primary;type:int(11)" json:"primary"`
	Secondary  int    `gorm:"column:secondary;type:int(11)" json:"secondary"`
	WorkflowId int    `gorm:"column:workflow_id;type:int(11)" json:"workflowId"`
	ParentId   int    `gorm:"column:parent_id;type:int(11)" json:"parentId"`
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
		PreviousContent string `gorm:"column:previous_content;type:longtext" json:"previousContent"`
		Utime           int64  `gorm:"bigint;autoUpdateTime;comment:update time" json:"utime"`
	}

	BigdataNodeHistory struct {
		UUID    string `gorm:"column:uuid;type:varchar(128);uix_uuid,unique" json:"uuid"`
		NodeId  int    `gorm:"column:node_id;type:int(11)" json:"nodeId"`
		Content string `gorm:"column:content;type:longtext" json:"content"`
		Uid     int    `gorm:"column:uid;type:int(11)" json:"uid"`
		Utime   int64  `gorm:"bigint;autoUpdateTime;comment:update time" json:"utime"`
	}
)

type BigdataSource struct {
	BaseModel

	Iid      int    `gorm:"column:iid;type:int(11)" json:"iid"`
	Name     string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // name of an alarm
	Desc     string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	URL      string `gorm:"column:url;type:varchar(255);NOT NULL" json:"url"`
	UserName string `gorm:"column:username;type:varchar(255);NOT NULL" json:"username"`
	Password string `gorm:"column:password;type:varchar(255);NOT NULL" json:"password"`
	Typ      int    `gorm:"column:typ;type:int(11)" json:"typ"`
	Uid      int    `gorm:"column:uid;type:int(11)" json:"uid"`
}

type BigdataWorkflow struct {
	BaseModel

	Iid  int    `gorm:"column:iid;type:int(11)" json:"iid"`
	Name string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // name of an alarm
	Desc string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	Uid  int    `gorm:"column:uid;type:int(11)" json:"uid"`
}

func WorkflowInfo(db *gorm.DB, id int) (resp BigdataWorkflow, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataWorkflow{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "workflow id: %d", id)
		return
	}
	return
}

func WorkflowList(conds egorm.Conds) (resp []*BigdataWorkflow, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataWorkflow{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func WorkflowCreate(db *gorm.DB, data *BigdataWorkflow) (err error) {
	if err = db.Model(BigdataWorkflow{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func WorkflowUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataWorkflow{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func WorkflowDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataWorkflow{}).Delete(&BigdataWorkflow{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

func SourceInfo(db *gorm.DB, id int) (resp BigdataSource, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataSource{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "source id: %d", id)
		return
	}
	return
}

func SourceList(conds egorm.Conds) (resp []*BigdataSource, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataSource{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func SourceCreate(db *gorm.DB, data *BigdataSource) (err error) {
	if err = db.Model(BigdataSource{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func SourceUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataSource{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func SourceDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataSource{}).Delete(&BigdataSource{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

func NodeInfo(db *gorm.DB, id int) (resp BigdataNode, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNode{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrap(err, "node info")
		return
	}
	return
}

func NodeList(conds egorm.Conds) (resp []*BigdataNode, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataNode{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

// NodeListWithWorker ...
// TertiaryClickHouse   = 10
// TertiaryMySQL        = 11
// TertiaryOfflineSync  = 20
func NodeListWithWorker() (resp []*BigdataNode, err error) {
	if err = invoker.Db.Model(BigdataNode{}).
		Where("tertiary=? or tertiary=? or tertiary=?", 10, 11, 20).Find(&resp).Error; err != nil {
		err = errors.Wrap(err, "")
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
		err = errors.Wrapf(err, "node content node id: %d", id)
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
		err = errors.Wrapf(err, "node history uuid: %s", uuid)
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

func FolderInfo(db *gorm.DB, id int) (resp BigdataFolder, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataFolder{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "folder id: %d", id)
		return
	}
	return
}

func FolderList(conds egorm.Conds) (resp []*BigdataFolder, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataFolder{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func FolderCreate(db *gorm.DB, data *BigdataFolder) (err error) {
	if err = db.Model(BigdataFolder{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func FolderUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataFolder{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func FolderDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataFolder{}).Delete(&BigdataFolder{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
