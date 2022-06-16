package db

import (
	"errors"
	"fmt"

	"github.com/ego-component/egorm"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type PmsCasbinRule struct {
	Id    uint   `gorm:"column:id;not null;primaryKey;autoIncrement;comment:'id'" json:"id" form:"id"`
	Ptype string `gorm:"column:ptype;not null;type:varchar(100);comment:'ptype: value in [p, g, g2, g3]'" json:"ptype" form:"ptype"`
	V0    string `gorm:"column:v0;not null;type:varchar(100);comment:'sub'" json:"v0" form:"v0"`
	V1    string `gorm:"column:v1;not null;type:varchar(100);comment:'obj'" json:"v1" form:"v1"`
	V2    string `gorm:"column:v2;not null;type:varchar(100);comment:'act'" json:"v2" form:"v2"`
	V3    string `gorm:"column:v3;not null;type:varchar(100);comment:'dom'" json:"v3" form:"v3"`
	V4    string `gorm:"column:v4;not null;type:varchar(25);comment:'reserved'" json:"v4" form:"v4"`
	V5    string `gorm:"column:v5;not null;type:varchar(25);comment:'reserved'" json:"v5" form:"v5"`
}

type CasbinRules []*PmsCasbinRule

func (t *PmsCasbinRule) TableName() string {
	return TableNamePmsCasbinRule
}

/*
TODO: 需要另外涉及一个table, 用于存储(管理, 维护, 记录) 当前已有 以及 允许的 role (userRole && resourceRole) 和 group等

BaseTable:
id(int): primary_key auto_increment
type(string): value in ["obj", "sub", "dom", "act"]
prefix(string): the permitted(valid) prefix of type; e.g.  ["user", "role",...] of sub
middle_part(string): e.g. "181", "app__svc-cow"
role(string): ["admin","viewer", "editor"...]
description(string): "对该条记录的描述

----------------------------
id(int),	type(string),	prefix(string)
id,			"obj" or "sub",

*/

/*
	TableDefaultRolePms: 记录belongType资源的默认角色; i.e. 当belongType资源创建时, 会根据该表中的记录去创建对应的casbinRules
	note: 需要保证 belong_type, role_name, resources, act 这4个字段建立联合唯一索引.
		  但由于resources字段是json类型, 不能用于uniqueIndex, TODO: 代码中保证4个字段的uniqueIndex
 		  不能只对belong_type和role_name两个字段设置uniqueIndex, 应为存在belong_type和role_name相同的情况(它们sub_resources不同)
*/
type PmsDefaultRole struct {
	BaseModel

	BelongType   string  `gorm:"column:belong_type;not null;size:50;comment:所属资源类型,如'app'" json:"belongType"`
	RoleName     string  `gorm:"column:role_name;not null;size:50;comment:所属资源的角色名称" json:"roleName"`
	Description  string  `gorm:"column:description;not null;size:255;default:'';comment:对角色的中文描述" json:"description"`
	SubResources Strings `gorm:"column:sub_resources;not null;type:json;comment:角色所属belongType资源下的子资源列表" json:"subResources"`
	Acts         Strings `gorm:"column:acts;not null;type:json;comment:对资源列表中各资源的actions" json:"acts"`
	UpdatedBy    int     `gorm:"column:updated_by;type:int(11);not null;default:0;comment:最近一次对记录做更新的用户id" json:"updatedBy"`
}

func (t *PmsDefaultRole) TableName() string {
	return TableNamePmsDefaultRole
}

// use it carefully.
func CasbinRuleDelete(tx *gorm.DB, conds egorm.Conds) (err error) {
	if _, exist := conds["v4"]; exist {
		return fmt.Errorf("v4 cannot exist in deletion conditions. ")
	}
	if _, exist := conds["v5"]; exist {
		return fmt.Errorf("v5 cannot exist in deletion conditions. ")
	}
	if len(conds) == 1 {
		if _, exist := conds["ptype"]; exist {
			return fmt.Errorf("deletiton conditions cannot only contain ptype! ")
		}
	}
	sql, binds := egorm.BuildQuery(conds)
	return tx.Table(TableNamePmsCasbinRule).Where(sql, binds).Delete(&PmsCasbinRule{}).Error
}

/*
	PmsCustomRole: 对资源的自定义角色表; 该表记录的增删会实时反映到 casbin_rule表中 (那么为什么不直接用casbin_rule表去维护?
因为, casbin_rule表中没有description描述, 该表的作用是供app负责人自定义一些在default_role_pms之外的一些角色.)
	note: 1. 需要保证 belong_type, refer_id, role_name, resources, act 这5个字段建立联合唯一索引.
		     但由于resources字段是json类型, 不能用于uniqueIndex, 所以需要代码去保证这5个字段的uniqueIndex
		  2. 是否支持custom_role_pms的自定义, 需要看当前代码实现, 目前支持的belong_type 为 ["app"]

*/
type PmsCustomRole struct {
	BaseModel
	BelongType   string  `gorm:"not null;size:50;comment:所属资源类型,如'app'" json:"belong_type"`
	ReferId      int     `gorm:"not null;comment:所属资源类型的对应资源id" json:"refer_id"`
	RoleName     string  `gorm:"not null;size:50;comment:所属对应资源的角色名称" json:"role_name"`
	Description  string  `gorm:"not null;size:255;default:'';comment:对角色的中文描述" json:"description"`
	SubResources Strings `gorm:"not null;type:json;comment:角色所属refer_id资源的子资源列表" json:"sub_resources"`
	Acts         Strings `gorm:"not null;type:json;comment:对资源列表中各资源的actions" json:"acts"`
	UpdatedBy    int     `gorm:"not null;default:0;comment:最近一次对记录做更新的用户id" json:"updated_by"`
}

func (t *PmsCustomRole) TableName() string {
	return TableNamePmsCustomRole
}

func GetDefaultRolePmsList(conds Conds) (resp []*PmsDefaultRole, err error) {
	sql, binds := BuildQuery(conds)
	if err = invoker.Db.Table(TableNamePmsDefaultRole).Where(sql, binds...).Find(&resp).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		invoker.Logger.Error("get default_role_pms list error", zap.Error(err))
		return
	}
	return
}

func GetCustomRolePmsList(conds Conds) (resp []*PmsCustomRole, err error) {
	sql, binds := BuildQuery(conds)
	if err = invoker.Db.Table(TableNamePmsCustomRole).Where(sql, binds...).Find(&resp).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		invoker.Logger.Error("get custom_role_pms list error", zap.Error(err))
		return
	}
	return
}

func PmsDefaultRoleCreate(item *PmsDefaultRole) (err error) {
	var info PmsDefaultRole
	err = invoker.Db.Where("belong_type = ? AND role_name = ?", item.BelongType, item.RoleName).Find(&info).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	// if already exist, return error
	if info.ID > 0 {
		err = errors.New("defaultRole already exist")
		return
	}
	err = invoker.Db.Create(item).Error
	return
}

func PmsCustomRoleCreate(item *PmsCustomRole) (err error) {
	var info PmsCustomRole
	err = invoker.Db.Where("belong_type = ? AND role_name = ? AND refer_id = ?", item.BelongType, item.RoleName, item.ReferId).Find(&info).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	// if already exist, return error
	if info.ID > 0 {
		err = errors.New("customRole of belongType resource already exist")
		return
	}
	err = invoker.Db.Create(item).Error
	return
}

func PmsCustomRoleDelete(paramId int) (err error) {
	if err = invoker.Db.Table(TableNamePmsCustomRole).Where("id = ?", paramId).Delete(&PmsCustomRole{}).Error; err != nil {
		invoker.Logger.Error("delete customRole error", zap.Error(err))
		return
	}
	return
}

func PmsDefaultRoleDelete(paramId int) (err error) {
	if err = invoker.Db.Table(TableNamePmsDefaultRole).Where("id = ?", paramId).Delete(&PmsDefaultRole{}).Error; err != nil {
		invoker.Logger.Error("delete defaultRole error", zap.Error(err))
		return
	}
	return
}

// TODO: caution with Default  and Custom role update! need compare act, subResource ant etc.
