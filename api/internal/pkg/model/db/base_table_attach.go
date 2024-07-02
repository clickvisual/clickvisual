package db

import (
	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// 2022/12/6

type IBaseTableAttach interface {
	TableName() string
	Create(db *gorm.DB) (err error)
	Update(db *gorm.DB, ups map[string]interface{}) (err error)
	Info(db *gorm.DB) (err error)
	InfoX(db *gorm.DB, conds map[string]interface{}) (err error)
	List(conds egorm.Conds) (resp []*BaseTableAttach, err error)
	Delete(db *gorm.DB) (err error)
}

type BaseTableAttach struct {
	Tid   int     `gorm:"column:tid;type:int(11);index:uix_tid,unique" json:"tid"`
	SQLs  Strings `gorm:"column:sqls;type:longtext" json:"sqls"`
	Names Strings `gorm:"column:names;type:text" json:"names"`
}

type ReqCreateBaseTableAttach struct {
	Alias     string `json:"alias" form:"alias"`
	Statement string `json:"statement" form:"statement"`
}

type ReqListBaseTableAttach struct {
	Alias string `json:"alias" form:"alias"`
}

type RespListBaseTableAttachItem struct {
	ID        string `json:"id"`
	Alias     string `json:"alias"`
	Statement string `json:"statement"`
}

type RespListBaseTableAttach struct {
	Total int64                         `json:"total"`
	List  []RespListBaseTableAttachItem `json:"list"`
}

func (model *BaseTableAttach) TableName() string {
	return TableNameBaseTableAttach
}

func (model *BaseTableAttach) Info(db *gorm.DB) (err error) {
	var sql = "`tid`= ?"
	var binds = []interface{}{model.Tid}
	if err = db.Model(BaseTableAttach{}).Where(sql, binds...).First(model).Error; err != nil {
		return errors.Wrapf(err, "tid: %d", model.Tid)
	}
	return
}

func (model *BaseTableAttach) InfoX(db *gorm.DB, conds map[string]interface{}) (err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Model(BaseTableAttach{}).Where(sql, binds...).First(model).Error; err != nil && err != gorm.ErrRecordNotFound {
		return errors.Wrapf(err, "conds: %v", conds)
	}
	return
}

func (model *BaseTableAttach) List(conds egorm.Conds) (resp []*BaseTableAttach, err error) {
	resp = make([]*BaseTableAttach, 0)
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(BaseTableAttach{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		return resp, errors.Wrapf(err, "conds: %v", conds)
	}
	return
}

func (model *BaseTableAttach) ListPage(db *gorm.DB, conds egorm.Conds, reqList *ReqPage) (total int64, respList []*BaseTableAttach) {
	respList = make([]*BaseTableAttach, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	query := db.Model(BaseTableAttach{}).Where(sql, binds...)
	query.Count(&total)
	query.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func (model *BaseTableAttach) Create(db *gorm.DB) (err error) {
	if err = db.Model(BaseTableAttach{}).Create(model).Error; err != nil {
		return errors.Wrapf(err, "data: %v", model)
	}
	return
}

func (model *BaseTableAttach) Update(db *gorm.DB, ups map[string]interface{}) (err error) {
	var sql = "`tid`=?"
	var binds = []interface{}{model.Tid}
	if err = db.Model(BaseTableAttach{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		return errors.Wrapf(err, "ups: %v", ups)
	}
	return
}

func (model *BaseTableAttach) Delete(db *gorm.DB) (err error) {
	if err = db.Model(BaseTableAttach{}).Delete(&BaseTableAttach{}, model.Tid).Error; err != nil {
		return errors.Wrapf(err, "tid: %v", model.Tid)
	}
	return
}
