package db

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Table struct {
	Did       int    `gorm:"column:did;type:bigint(20)" json:"did"`                    // 数据库 id
	Name      string `gorm:"column:name;type:varchar(64);NOT NULL" json:"name"`        // table
	Typ       int    `gorm:"column:typ;type:int(11)" json:"typ"`                       // table 类型 1 string 2 float
	Days      int    `gorm:"column:days;type:int(11)" json:"days"`                     // 数据过期时间
	Brokers   string `gorm:"column:brokers;type:varchar(255);NOT NULL" json:"brokers"` // kafka broker
	Topic     string `gorm:"column:topic;type:varchar(128);NOT NULL" json:"topic"`     // kafka topic
	SqlData   string `gorm:"column:sql_data;type:text" json:"sql_data"`                // sql_data
	SqlStream string `gorm:"column:sql_stream;type:text" json:"sql_stream"`            // sql_stream
	SqlView   string `gorm:"column:sql_view;type:text" json:"sql_view"`                // sql_view
	Uid       int    `gorm:"column:uid;type:int(11)" json:"uid"`                       // 操作人

	Database *Database `json:"database,omitempty" gorm:"foreignKey:Did;references:ID"`

	BaseModel
}

func (m *Table) TableName() string {
	return TableNameTable
}

// TableCreate ...
func TableCreate(db *gorm.DB, data *Table) (err error) {
	if err = db.Model(Table{}).Create(data).Error; err != nil {
		elog.Error("release error", zap.Error(err))
		return
	}
	return
}

// TableDelete Soft delete
func TableDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Table{}).Unscoped().Delete(&Table{}, id).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

// TableInfoX Info extension method to query a single record according to Cond
func TableInfoX(db *gorm.DB, conds map[string]interface{}) (resp Table, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameTable).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("infoX error", zap.Error(err))
		return
	}
	return
}

func TableInfo(db *gorm.DB, paramId int) (resp Table, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameTable).Preload("Database").Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

// TableUpdate ...
func TableUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameTable).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

// TableList Get all currently undeleted clusters. Mainly used for front end
func TableList(db *gorm.DB, conds egorm.Conds) (resp []*Table, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = db.Table(TableNameTable).Preload("Database").Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list error", elog.String("err", err.Error()))
		return
	}
	return
}
