package db

import (
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	BigdataNodeResultUnknown int = iota
	BigdataNodeResultSucc
	BigdataNodeResultFailed
)

type BigdataNodeResult struct {
	BaseModel

	NodeId       int    `gorm:"column:node_id;type:int(11)" json:"nodeId"`
	Content      string `gorm:"column:content;type:longtext" json:"content"`
	Result       string `gorm:"column:result;type:longtext" json:"result"`
	ExcelProcess string `gorm:"column:excel_process;type:longtext" json:"excelProcess"`
	Uid          int    `gorm:"column:uid;type:int(11)" json:"uid"`
	Cost         int64  `gorm:"column:cost;type:bigint(20)" json:"cost"` // ms
	Status       int    `gorm:"column:status;type:int(11)" json:"status"`
}

func (m *BigdataNodeResult) TableName() string {
	return TableNameBigDataNodeResult
}

func NodeResultInfo(db *gorm.DB, id int) (resp BigdataNodeResult, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeResult{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "node result node id: %d", id)
		return
	}
	return
}

func NodeResultCreate(db *gorm.DB, data *BigdataNodeResult) (err error) {
	if err = db.Model(BigdataNodeResult{}).Create(data).Error; err != nil {
		return errors.Wrap(err, "NodeResultCreate")
	}
	return
}

func NodeResultUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BigdataNodeResult{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		return errors.Wrap(err, "NodeResultUpdate")
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

func NodeResultList(conds egorm.Conds) (resp []*BigdataNodeResult, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Select("id, ctime, status").Where(sql, binds...).Order("id desc").Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
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
	db := invoker.Db.Select("id, ctime, utime, uid, cost, status, node_id").Model(BigdataNodeResult{}).Where(sql, binds...).Order("id desc")
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}
