package db

import (
	"fmt"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type BigdataDepend struct {
	Iid                  int     `gorm:"column:iid;type:int(11);index:uix_iid_database_table,unique" json:"iid"`
	Database             string  `gorm:"column:database;type:varchar(64);index:uix_iid_database_table,unique;NOT NULL" json:"database"`
	Table                string  `gorm:"column:table;type:varchar(128);index:uix_iid_database_table,unique;NOT NULL" json:"table"`
	Engine               string  `gorm:"column:engine;type:varchar(128);NOT NULL" json:"engine"`
	DownDepDatabaseTable Strings `gorm:"column:down_dep_database_table;type:text;NOT NULL" json:"downDepDatabaseTable"`
	UpDepDatabaseTable   Strings `gorm:"column:up_dep_database_table;type:text;NOT NULL" json:"upDepDatabaseTable"`
	Rows                 uint64  `gorm:"column:rows;type:bigint(20);default:0;NOT NULL" json:"rows"`
	Bytes                uint64  `gorm:"column:bytes;type:bigint(20);default:0;NOT NULL" json:"bytes"`

	Utime int64 `gorm:"bigint;autoUpdateTime;comment:更新时间" json:"utime"`
}

func (m *BigdataDepend) TableName() string {
	return TableNameBigDataDepend
}

func (m *BigdataDepend) Name() string {
	return fmt.Sprintf("%s.%s", m.Database, m.Table)
}

func (m *BigdataDepend) Key() string {
	return fmt.Sprintf("%d.%s.%s", m.Iid, m.Database, m.Table)
}

func DependsList(conds egorm.Conds) (resp []*BigdataDepend, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BigdataDepend{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func EarliestDependRow(iid int) (resp BigdataDepend, err error) {
	if err = invoker.Db.Model(BigdataDepend{}).Where("iid = ?", iid).Order("utime asc").Limit(1).Find(&resp).Error; err != nil {
		err = errors.Wrap(err, "")
		return
	}
	return
}

func DependsBatchInsert(db *gorm.DB, rows []*BigdataDepend) (err error) {
	if err = db.Model(BigdataDepend{}).CreateInBatches(rows, len(rows)).Error; err != nil {
		elog.Error("batch create error", zap.Error(err))
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
