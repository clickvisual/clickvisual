package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (m *BigdataNode) TableName() string {
	return TableNameBigDataNode
}

func (m *BigdataNodeContent) TableName() string {
	return TableNameBigDataNodeContent
}

type (
	BigdataNode struct {
		BaseModel

		Uid      int `gorm:"column:uid;type:int(11)" json:"uid"`
		Iid      int `gorm:"column:iid;type:int(11)" json:"iid"`
		FolderID int `gorm:"column:folder_id;type:int(11)" json:"folderId"`

		Primary    int `gorm:"column:primary;type:int(11)" json:"primary"`
		Secondary  int `gorm:"column:secondary;type:int(11)" json:"secondary"`
		Tertiary   int `gorm:"column:tertiary;type:int(11)" json:"tertiary"`
		WorkflowId int `gorm:"column:workflow_id;type:int(11)" json:"workflowId"`

		Name    string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
		Desc    string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"`
		LockUid int    `gorm:"column:lock_uid;type:int(11) unsigned" json:"lockUid"`
		LockAt  int64  `gorm:"column:lock_at;type:bigint(11) unsigned" json:"lockAt"`
	}

	BigdataNodeContent struct {
		NodeId  int    `gorm:"column:node_id;type:int(11);uix_node_id,unique" json:"nodeId"`
		Content string `gorm:"column:content;type:longtext" json:"content"`
	}
)

const (
	PrimaryOffline  = 1
	PrimaryRealTime = 2
	PrimaryShort    = 3
)

func NodeInfo(db *gorm.DB, id int) (resp BigdataNode, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNode{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func NodeList(conds egorm.Conds) (resp []*BigdataNode, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataNode{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func NodeCreate(db *gorm.DB, data *BigdataNode) (err error) {
	if err = db.Model(BigdataNode{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func NodeUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNode{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func NodeDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataNode{}).Delete(&BigdataNode{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func NodeContentInfo(db *gorm.DB, id int) (resp BigdataNodeContent, err error) {
	var sql = "`node_id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeContent{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func NodeContentCreate(db *gorm.DB, data *BigdataNodeContent) (err error) {
	if err = db.Model(BigdataNodeContent{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func NodeContentUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`node_id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeContent{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func NodeContentDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(BigdataNodeContent{}).Where("node_id=?", id).Unscoped().Delete(&BigdataNodeContent{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
