package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

// View Materialized view management
type View struct {
	BaseModel

	Tid              int    `gorm:"column:tid;type:bigint(11);index:uix_tid_name,unique" json:"tid"`             // table id
	Name             string `gorm:"column:name;type:varchar(64);NOT NULL;index:uix_tid_name,unique" json:"name"` // 视图名称
	IsUseDefaultTime int    `gorm:"column:is_use_default_time;type:int(11)" json:"isUseDefaultTime"`             // 是否使用系统时间
	Key              string `gorm:"column:key;type:varchar(64);NOT NULL" json:"key"`                             // 指定时间字段Key名称
	Format           string `gorm:"column:format;type:varchar(64);NOT NULL" json:"format"`                       // 时间转换格式
	SqlView          string `gorm:"column:sql_view;type:text" json:"sqlView"`                                    // sql_view
	Uid              int    `gorm:"column:uid;type:int(11)" json:"uid"`                                          // 操作人
	Ctime            int    `gorm:"column:ctime;type:int(11)" json:"ctime"`                                      // 创建时间
	Utime            int    `gorm:"column:utime;type:int(11)" json:"utime"`                                      // 更新时间
	Dtime            int    `gorm:"column:dtime;type:int(11)" json:"dtime"`                                      // 删除时间
}

func (m *View) TableName() string {
	return TableNameView
}

// ViewUpdate ...
func ViewUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameView).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update error", zap.Error(err))
		return
	}
	return
}

func ViewInfo(db *gorm.DB, paramId int) (resp View, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameView).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("info error", zap.Error(err))
		return
	}
	return
}

// ViewInfoX Info extension method to query a single record according to Cond
func ViewInfoX(conds map[string]interface{}) (resp View, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameView).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func ViewCreate(db *gorm.DB, data *View) (err error) {
	if err = db.Model(View{}).Create(data).Error; err != nil {
		invoker.Logger.Error("release error", zap.Error(err))
		return
	}
	return
}

// ViewDelete  Soft delete
func ViewDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(View{}).Unscoped().Delete(&View{}, id).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// ViewDeleteByTableID  Soft delete
func ViewDeleteByTableID(db *gorm.DB, tid int) (err error) {
	if err = db.Model(View{}).Where("tid = ?", tid).Unscoped().Delete(&View{}).Error; err != nil {
		invoker.Logger.Error("delete error", zap.Error(err))
		return
	}
	return
}

// ViewList Get all currently undeleted clusters. Mainly used for front end
func ViewList(db *gorm.DB, conds egorm.Conds) (resp []*View, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameView).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
