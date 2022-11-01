package db

import (
	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

type ICollect interface {
	TableName() string
	Create(db *gorm.DB) (err error)
	Update(db *gorm.DB, ups map[string]interface{}) (err error)
	Info(db *gorm.DB) (err error)
	InfoX(db *gorm.DB, conds map[string]interface{}) (err error)
	List(db *gorm.DB, conds egorm.Conds) (resp []*Collect, err error)
	ListPage(db *gorm.DB, conds egorm.Conds, reqList *ReqPage) (total int64, respList []*Collect)
	Delete(db *gorm.DB) (err error)
}

type Collect struct {
	BaseModel

	Uid       int    `gorm:"column:uid;type:int(11)" json:"uid"`
	Alias     string `gorm:"column:alias;type:varchar(255);NOT NULL" json:"alias"`
	Statement string `gorm:"column:statement;type:text" json:"statement"`
}

type ReqCreateCollect struct {
	Alias     string `json:"alias" form:"alias"`
	Statement string `json:"statement" form:"statement"`
}

type ReqListCollect struct {
	Alias string `json:"alias" form:"alias"`
}

type RespListCollectItem struct {
	ID        int    `json:"id"`
	Alias     string `json:"alias"`
	Statement string `json:"statement"`
}

type RespListCollect struct {
	Total int64                  `json:"total"`
	List  []*RespListCollectItem `json:"list"`
}

func (model *Collect) TableName() string {
	return TableNameCollect
}

func (model *Collect) Info(db *gorm.DB) (err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{model.ID}
	if err = db.Model(Collect{}).Where(sql, binds...).First(model).Error; err != nil {
		return errors.Wrapf(err, "id: %d", model.ID)
	}
	return
}

func (model *Collect) InfoX(db *gorm.DB, conds map[string]interface{}) (err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Model(Collect{}).Where(sql, binds...).First(model).Error; err != nil && err != gorm.ErrRecordNotFound {
		return errors.Wrapf(err, "conds: %v", conds)
	}
	return
}

func (model *Collect) List(db *gorm.DB, conds egorm.Conds) (resp []*Collect, err error) {
	resp = make([]*Collect, 0)
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Model(Collect{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		return resp, errors.Wrapf(err, "conds: %v", conds)
	}
	return
}

func (model *Collect) ListPage(db *gorm.DB, conds egorm.Conds, reqList *ReqPage) (total int64, respList []*Collect) {
	respList = make([]*Collect, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	query := db.Model(Collect{}).Where(sql, binds...)
	query.Count(&total)
	query.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}

func (model *Collect) Create(db *gorm.DB) (err error) {
	if err = db.Model(Collect{}).Create(model).Error; err != nil {
		return errors.Wrapf(err, "data: %v", model)
	}
	return
}

func (model *Collect) Update(db *gorm.DB, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{model.ID}
	if err = db.Model(Collect{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		return errors.Wrapf(err, "ups: %v", ups)
	}
	return
}

func (model *Collect) Delete(db *gorm.DB) (err error) {
	if err = db.Model(Collect{}).Delete(&Collect{}, model.ID).Error; err != nil {
		return errors.Wrapf(err, "id: %v", model.ID)
	}
	return
}
