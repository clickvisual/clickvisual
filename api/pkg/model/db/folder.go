package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (m *Folder) TableName() string {
	return TableNameBigDataFolder
}

type Folder struct {
	BaseModel

	Uid       int    `gorm:"column:uid;type:int(11)" json:"uid"` // uid of alarm operator
	Iid       int    `gorm:"column:iid;type:int(11)" json:"iid"`
	Name      string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // name of an alarm
	Desc      string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"` // description
	Primary   int    `gorm:"column:primary;type:int(11)" json:"primary"`
	Secondary int    `gorm:"column:secondary;type:int(11)" json:"secondary"`
	ParentId  int    `gorm:"column:parent_id;type:int(11)" db:"parent_id" json:"parentId"`
}

func FolderInfo(db *gorm.DB, id int) (resp Folder, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(Folder{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func FolderList(conds egorm.Conds) (resp []*Folder, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(Folder{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func FolderCreate(db *gorm.DB, data *Folder) (err error) {
	if err = db.Model(Folder{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func FolderUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Folder{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func FolderDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(Folder{}).Where("`tid`=?", tid).Unscoped().Delete(&Folder{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func FolderDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Folder{}).Delete(&Folder{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
