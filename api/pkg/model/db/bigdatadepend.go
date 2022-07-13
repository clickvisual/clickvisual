package db

import (
	"fmt"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (m *BigdataDepend) TableName() string {
	return TableNameBigDataDepend
}

type BigdataDepend struct {
	Iid                  int     `gorm:"column:iid;type:int(11);index:uix_iid_database_table,unique" json:"iid"`
	Database             string  `gorm:"column:database;type:varchar(128);index:uix_iid_database_table,unique;NOT NULL" json:"database"`
	Table                string  `gorm:"column:table;type:varchar(128);index:uix_iid_database_table,unique;NOT NULL" json:"table"`
	Engine               string  `gorm:"column:engine;type:varchar(128);NOT NULL" json:"engine"`
	DownDepDatabaseTable Strings `gorm:"column:down_dep_database_table;type:text;NOT NULL" json:"down_dep_database_table"`
	UpDepDatabaseTable   Strings `gorm:"column:up_dep_database_table;type:text;NOT NULL" json:"up_dep_database_table"`
	Rows                 uint64  `gorm:"column:rows;type:bigint(20);default:0;NOT NULL" json:"rows"`
	Bytes                uint64  `gorm:"column:bytes;type:bigint(20);default:0;NOT NULL" json:"bytes"`

	Utime int64 `gorm:"bigint;autoUpdateTime;comment:更新时间" json:"utime"`
}

func (m *BigdataDepend) Name() string {
	return fmt.Sprintf("%s.%s", m.Database, m.Table)
}

func (m *BigdataDepend) Key() string {
	return fmt.Sprintf("%d.%s.%s", m.Iid, m.Database, m.Table)
}

func DependsInfo(db *gorm.DB, id int) (resp BigdataDepend, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataDepend{}).Where(sql, binds...).First(&resp).Error; err != nil {
		elog.Error("info error", zap.Error(err))
		return
	}
	return
}

func DependsInfoX(conds map[string]interface{}) (resp BigdataDepend, err error) {
	sql, binds := egorm.BuildQuery(conds)
	err = invoker.Db.Table(TableNameBigDataDepend).Where(sql, binds...).First(&resp).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return resp, nil
}

func DependsList(conds egorm.Conds) (resp []*BigdataDepend, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataDepend{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func DependsUpsList(db *gorm.DB, iid int, database, table string) (resp []*BigdataDepend, err error) {
	var conds = make(map[string]interface{}, 0)
	conds["iid"] = iid
	conds["up_dep_database_table"] = egorm.Cond{
		Op:  "like",
		Val: fmt.Sprintf(`"%s.%s"`, database, table),
	}
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Model(BigdataDepend{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		elog.Error("list error", zap.Error(err))
		return
	}
	return
}

func DependsCreateOrUpdate(db *gorm.DB, data *BigdataDepend) (err error) {
	var row BigdataDepend
	conds := egorm.Conds{}
	conds["iid"] = data.Iid
	conds["database"] = data.Database
	conds["table"] = data.Table
	if row, err = DependsInfoX(conds); err != nil {
		return
	}
	if row.Iid == 0 {
		// create
		if err = db.Model(BigdataDepend{}).Create(data).Error; err != nil {
			elog.Error("create error", zap.Error(err))
			return
		}
		return
	}
	// update
	cu := egorm.Conds{}
	cu["engine"] = data.Engine
	cu["down_dep_database_table"] = data.DownDepDatabaseTable
	cu["up_dep_database_table"] = data.UpDepDatabaseTable
	cu["rows"] = data.Rows
	cu["bytes"] = data.Bytes
	return DependsUpdate(db, data.Iid, data.Database, data.Table, cu)
}

func DependsBatchInsert(db *gorm.DB, rows []*BigdataDepend) (err error) {
	if err = db.Model(BigdataDepend{}).CreateInBatches(rows, len(rows)).Error; err != nil {
		elog.Error("batch create error", zap.Error(err))
		return
	}
	return
}

func DependsUpdate(db *gorm.DB, iid int, database, table string, ups map[string]interface{}) (err error) {
	var sql = "`iid`=? and `database`=? and `table` = ?"
	var binds = []interface{}{iid, database, table}
	if err = db.Model(BigdataDepend{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func DependsDeleteTimeout(db *gorm.DB) (err error) {
	if err = db.Where("utime<?", time.Now().Add(-time.Minute*10).Unix()).Model(BigdataDepend{}).Delete(&BigdataDepend{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}

func DependsDeleteAll(db *gorm.DB, iid int) (err error) {
	if err = db.Where("iid=?", iid).Model(BigdataDepend{}).Delete(&BigdataDepend{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
	return
}
