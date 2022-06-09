package db

import (
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type ShortSQL struct {
	BaseModel

	Uid      int    `gorm:"column:uid;type:int(11)" json:"uid"`
	FolderID int    `gorm:"column:folder_id;type:int(11)" json:"folderId"`
	Name     string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
	Desc     string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"`
	Content  string `gorm:"column:tag;type:text" json:"content"`
}

func ShortSQLInfo(db *gorm.DB, id int) (resp ShortSQL, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(ShortSQL{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("release info error", zap.Error(err))
		return
	}
	return
}

func ShortSQLList(conds egorm.Conds) (resp []*ShortSQL, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(ShortSQL{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("Deployment list error", zap.Error(err))
		return
	}
	return
}

func ShortSQLCreate(db *gorm.DB, data *ShortSQL) (err error) {
	if err = db.Model(ShortSQL{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func ShortSQLUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(ShortSQL{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func ShortSQLDeleteBatch(db *gorm.DB, tid int) (err error) {
	if err = db.Model(ShortSQL{}).Where("`tid`=?", tid).Unscoped().Delete(&ShortSQL{}).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func ShortSQLDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(ShortSQL{}).Unscoped().Delete(&ShortSQL{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
