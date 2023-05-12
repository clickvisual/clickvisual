package db

import (
	"fmt"
	"sort"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

const (
	_ = iota
	PmsRoleTypeDefault
	PmsRoleTypeCustom
	// other types may added in future
)

const (
	RefId = "{{ID}}" // is used to replace with real resourceObjId in ruleTpl when adding to casbin
	// used to generate "p" type ruleTpl like: role__{{PmsRole:Id}}__{{PmsRole:BelongResource}}__{{ID}},{{PmsRole:BelongResource}}__{{ID}}__subResource__(SubResourceRegex),ActsRegex,{{DOM}}
	TplOfRuleTpl = "role__%d__%s__{{ID}},%s__{{ID}}__subResource__%s,%s,*" // contains the const RefId. do not contain any blank chars
)

/*
	PmsRole说明:
		1. 当前RoleType分为两类:
			0: "代表默认角色, 该类角色可被用于所属的所有资源对象上, 只有管理员可以创建该类角色",
			1: "代表自定义角色, 该类角色只能被用于referId所指定的对象上"
		2. 相同belongResource下(如app), 不允许有同名的role存在(使用了uniqueIndex做了限制),无论roleType是什么.
		3. 其下的Details, 即pms_role_detail表中关联的记录, 每个detail都可被用于生成casbin中的p规则.
           所以当一个PmsRole被拿来用于授权给用户时, 需要先检查并保证casbin中已经创建了所有的details!
*/

type PmsRole struct {
	BaseModel

	Name           string           `gorm:"not null;type:varchar(64);column:name;comment:角色英文名,可修改,不唯一" json:"name"`
	Desc           string           `gorm:"not null;type:varchar(128);default:'';column:desc;comment:角色描述" json:"desc"`
	BelongResource string           `gorm:"not null;type:varchar(32);column:belong_resource;comment:角色所属资源,创建后不可修改,如app" json:"belongResource"`
	RoleType       int              `gorm:"not null;type:tinyint(2);default:0;column:role_type;comment:角色类型[1:默认角色, 2:自定义角色],创建后不可修改" json:"roleType"`
	ResourceId     int              `gorm:"not null;default:0;column:resource_id;comment:所属资源的id[默认角色该字段为0, 自定义角色不为0],创建后不可修改" json:"resourceId"`
	Details        []*PmsRoleDetail `gorm:"->" json:"details"`
	Refs           []*PmsRoleRef    `gorm:"->" json:"refs"`
	// InheritRoleId  int              `gorm:"not null;default:0;column:inherit_role_id;comment:继承角色的id,即该表中已存在的记录id, 0表示不继承,创建后不可修改" json:"inheritRoleId"` // TODO
}

// PmsRoleDetail uniqueIndex is not support for json column, please make sure (pms_role_id, sub_resources) is unique, and (pms_role_id, acts) is unique.
type PmsRoleDetail struct {
	BaseModel

	PmsRoleId    int     `gorm:"type:int(11);not null;column:pms_role_id;comment:所属pmsRole的id" json:"pmsRoleId"`
	SubResources Strings `gorm:"not null;type:json;column:sub_resources;comment:授权目标资源的子资源列表" json:"subResources"`
	Acts         Strings `gorm:"not null;type:json;column:acts;comment:准许动作列表" json:"acts"`
	RuleTpl      string  `gorm:"not null;type:text;column:rule_tpl;comment:规则模板,用于生成casbin中的p类型规则" json:"-"`
}

// PmsRoleRef the table to store the assignment states of every PmsRole.
// Note, add or delete one record, must create or remove corresponding p rules(which generated from details)
type PmsRoleRef struct {
	ID        int                `json:"id" gorm:"column:id;type:int;not null;primary_key;auto_increment"`
	PmsRoleId int                `gorm:"not null;column:pms_role_id;uniqueIndex:uix_role_ref;comment:已存在的角色(pms_role)的Id" json:"pmsRoleId"`
	RefId     int                `gorm:"not null;column:ref_id;uniqueIndex:uix_role_ref;comment:角色belongResource类型对象的id" json:"refId"`
	Grants    []*PmsRoleRefGrant `gorm:"->" json:"-"`
}

// PmsRoleRefGrant Note, all columns can NOT be modified after crated. if want to modify, please, remove and add again.
// add or delete record, must create or remove corresponding gType rules
type PmsRoleRefGrant struct {
	ID           int    `gorm:"column:id;type:int;not null;primary_key;auto_increment" json:"id" `
	PmsRoleRefId int    `gorm:"not null;column:pms_role_ref_id;uniqueIndex:uix_ref_obj_domain;comment:所关联pms_role_ref的Id" json:"pmsRoleRefId"`
	Ptype        string `gorm:"not null;default:'';type:varchar(8);column:ptype;comment:所使用的casbin group规则类型.[g, g2, g3]" json:"ptype,omitempty"`
	ObjectType   string `gorm:"not null;type:varchar(128);column:object_type;uniqueIndex:uix_ref_obj_domain;comment:被授权对象的类型.如user等" json:"objectType,omitempty"`
	ObjectId     int    `gorm:"not null;column:object_id;uniqueIndex:uix_ref_obj_domain;comment:被授权对象的id" json:"objectId,omitempty"`
	DomainType   string `gorm:"not null;type:varchar(64);default:'';column:domain_type;uniqueIndex:uix_ref_obj_domain;comment:授权所在domain的类型.如, env, ent等" json:"domainType"`
	DomainId     int    `gorm:"not null;default:0;column:domain_id;uniqueIndex:uix_ref_obj_domain;comment:domain_type不为空时,对应domain类型对象的id" json:"domainId"`
}

type PmsCasbinRule struct {
	Id    uint   `gorm:"column:id;not null;primaryKey;autoIncrement;comment:'id'" json:"id" form:"id"`
	Ptype string `gorm:"column:ptype;not null;type:varchar(100);comment:'ptype: value in [p, g, g2, g3]'" json:"ptype" form:"ptype"`
	V0    string `gorm:"column:v0;not null;type:varchar(100);comment:'sub'" json:"v0" form:"v0"`
	V1    string `gorm:"column:v1;not null;type:varchar(100);comment:'obj'" json:"v1" form:"v1"`
	V2    string `gorm:"column:v2;not null;type:varchar(100);comment:'act'" json:"v2" form:"v2"`
	V3    string `gorm:"column:v3;not null;type:varchar(100);comment:'dom'" json:"v3" form:"v3"`
	V4    string `gorm:"column:v4;not null;type:varchar(100);comment:'reserved'" json:"v4" form:"v4"`
	V5    string `gorm:"column:v5;not null;type:varchar(100);comment:'reserved'" json:"v5" form:"v5"`
	V6    string `gorm:"column:v6;not null;type:varchar(25);comment:'reserved'" json:"v6" form:"v6"`
	V7    string `gorm:"column:v7;not null;type:varchar(25);comment:'reserved'" json:"v7" form:"v7"`
}

type CasbinRules []*PmsCasbinRule

func (t *PmsCasbinRule) TableName() string {
	return TableNamePmsCasbinRule
}

func (pr *PmsRole) TableName() string {
	return TableNamePmsRole
}

func (prd *PmsRoleDetail) TableName() string {
	return TableNamePmsRoleDetail
}

func (prf *PmsRoleRef) TableName() string {
	return TableNamePmsRoleRef
}

func (prfg *PmsRoleRefGrant) TableName() string {
	return TableNamePmsRoleRefGrant
}

func (pr *PmsRole) IsDetailsValid() (err error) {
	lenD := len(pr.Details)
	if lenD <= 0 {
		return fmt.Errorf("pmsRoles must authorize detail(s). ")
	}
	if lenD == 1 {
		return nil
	}
	cmpFunc := func(a, b interface{}) bool { return a.(string) == b.(string) }
	for i := 0; i < lenD-1; i++ {
		for j := i + 1; j < lenD; j++ {
			// do not forget to check "*" in subResources and acts of two details.
			if utils.IsSliceEqual(pr.Details[i].SubResources, pr.Details[j].SubResources) ||
				utils.IsSliceEqual(pr.Details[i].Acts, pr.Details[j].Acts) {
				return fmt.Errorf("same SubResources or Acts have been found in pmsRole.Details. U should merge them. ")
			} else if utils.FindIndex(pr.Details[i].SubResources, "*", cmpFunc) != -1 &&
				utils.FindIndex(pr.Details[j].SubResources, "*", cmpFunc) != -1 {
				return fmt.Errorf("subResources [%s] and [%s] can be merged. Each of them contains a start *. ",
					strings.Join(pr.Details[i].SubResources, ","), strings.Join(pr.Details[j].SubResources, ","))
			} else if utils.FindIndex(pr.Details[i].Acts, "*", cmpFunc) != -1 &&
				utils.FindIndex(pr.Details[j].Acts, "*", cmpFunc) != -1 {
				return fmt.Errorf("acts [%s] and [%s] can be merged. Each of them contains a start *. ",
					strings.Join(pr.Details[i].Acts, ","), strings.Join(pr.Details[j].Acts, ","))
			}
		}
	}
	return nil
}

// GenerateOnePRuleTplByDetail : Generate a pType casbin policy string based on inputParam(PmsRoleDetail)
// returned resp(if not empty) like,
//
//	role__{{PmsRole:Id}}__{{PmsRole:BelongResource}}__{{ID}},{{PmsRole:BelongResource}}__{{ID}}__subResource__(SubResourceRegex),ActsRegex,*
func (pr *PmsRole) GenerateOnePRuleTplByDetail(roleDetail *PmsRoleDetail) (resp string, err error) {
	if roleDetail == nil {
		return "", fmt.Errorf("roleDetail cannot be null. ")
	}
	if len(roleDetail.Acts) <= 0 || len(roleDetail.SubResources) <= 0 {
		return "", fmt.Errorf("subResourceList or ActList of roleDetail cannot be empty. ")
	}

	var regexSubRsrc, regexAct string
	for _, subRsrcStr := range roleDetail.SubResources {
		if strings.TrimSpace(subRsrcStr) == "*" {
			regexSubRsrc = "*"
			break
		}
	}
	for _, actStr := range roleDetail.Acts {
		if strings.TrimSpace(actStr) == "*" {
			regexAct = "*"
			break
		}
	}
	if regexSubRsrc == "" {
		sort.Strings(roleDetail.SubResources)
		regexSubRsrc = fmt.Sprintf("(%s)", strings.Join(roleDetail.SubResources, "|"))
	}
	if regexAct == "" {
		sort.Strings(roleDetail.Acts)
		regexAct = fmt.Sprintf("(%s)", strings.Join(roleDetail.Acts, "|"))
	}
	resp = fmt.Sprintf(TplOfRuleTpl, pr.ID, pr.BelongResource, pr.BelongResource, regexSubRsrc, regexAct)
	// fmt.Printf("====> RuleTpl gened from roleDetail: %s\n", resp)
	return
}

func PmsRoleInfo(id int) (resp *PmsRole, err error) {
	if err = invoker.Db.Table(TableNamePmsRole).Where("id = ?", id).First(&resp).Error; err != nil {
		elog.Error("get pms_role by id failed.", zap.Error(err))
		return
	}
	err = invoker.Db.Table(TableNamePmsRoleDetail).Where("pms_role_id = ?", resp.ID).Find(&(resp.Details)).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	err = invoker.Db.Table(TableNamePmsRoleRef).Where("pms_role_id = ?", resp.ID).Find(&(resp.Refs)).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	// do not contain grant info
	return
}

// not contain grant info
func PmsRoleInfoWithTgtRef(roleId int, belongResource string, resourceId int) (resp *PmsRole, err error) {
	err = invoker.Db.Preload("Details").Preload("Refs", "ref_id=?", resourceId).
		Where("id=? AND belong_resource=?", roleId, belongResource).First(&resp).Error
	return
}

func GetPmsRoleList(conds egorm.Conds) (resp []*PmsRole, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNamePmsRole).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	for _, pmsRole := range resp {
		err = invoker.Db.Table(TableNamePmsRoleDetail).Where("pms_role_id = ?", pmsRole.ID).Find(&(pmsRole.Details)).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return
		}
		err = invoker.Db.Table(TableNamePmsRoleRef).Where("pms_role_id = ?", pmsRole.ID).Find(&(pmsRole.Refs)).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return
		}
	}
	return
}

// GetPmsRoleRefList for resp, default do not contain grants info
func GetPmsRoleRefList(conds egorm.Conds, withGrants ...bool) (resp []*PmsRoleRef, err error) {
	var searchGrants = false
	if len(withGrants) >= 1 {
		searchGrants = withGrants[0]
	}
	sql, binds := egorm.BuildQuery(conds)

	if searchGrants {
		err = invoker.Db.Preload("Grants").Where(sql, binds...).Find(&resp).Error
	} else {
		err = invoker.Db.Table(TableNamePmsRoleRef).Where(sql, binds...).Find(&resp).Error
	}
	return
}

func GetPmsRoleRefInfo(conds egorm.Conds) (resp PmsRoleRef, err error) {
	sql, binds := egorm.BuildQuery(conds)
	err = invoker.Db.Table(TableNamePmsRoleRef).Where(sql, binds...).First(&resp).Error
	return
}

func CreatePmsRole(db *gorm.DB, data *PmsRole) (err error) {
	if len(data.Details) <= 0 {
		return fmt.Errorf("pms_role must authorize detail(s)! ")
	}
	if data.RoleType == PmsRoleTypeCustom {
		// the resourceId of custom role cannot be zero
		if data.ResourceId <= 0 {
			return fmt.Errorf("customRole must have belonged resourceId. ")
		}
	} else if data.RoleType == PmsRoleTypeDefault {
		// the resourceId of default role is zero
		data.ResourceId = 0
	} else {
		return fmt.Errorf("invalid roleType %d", data.RoleType)
	}
	tx := db.Begin()
	// create pms_role first
	if err = tx.Model(data).Create(&data).Error; err != nil {
		elog.Error("Create pms_role error", zap.Error(err))
		tx.Rollback()
		return
	}
	// then create details
	for _, detail := range data.Details {
		detail.RuleTpl, err = data.GenerateOnePRuleTplByDetail(detail)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("generate ruleTpl of one of newRole.details failed. %w", err)
		}
		detail.PmsRoleId = data.ID
		if err = tx.Model(detail).Create(detail).Error; err != nil {
			elog.Error("Create pms_role_detail error", zap.Error(err))
			tx.Rollback()
			return
		}
	}
	// do not create refs in CreatePmsRole.
	tx.Commit()
	return
}

func CreatePmsRoleDetail(db *gorm.DB, data *PmsRoleDetail) (err error) {
	if err = db.Model(data).Create(data).Error; err != nil {
		elog.Error("create pms_role_detail error", zap.Error(err))
		return
	}
	return
}

// please make sure the associated casbinRules have removed after deleted pmsRole. do not only invoke this func to delete pmsRole.
func DeletePmsRoleById(tx *gorm.DB, pmsRoleId int) (err error) {
	// delete detail(s) first
	if err = tx.Where("pms_role_id=?", pmsRoleId).Delete(&PmsRoleDetail{}).Error; err != nil {
		elog.Error("delete PmsRoleDetail failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleDetail error. ")
	}

	// delete grant of each ref
	refs, err := GetPmsRoleRefList(egorm.Conds{"pms_role_id": pmsRoleId})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		elog.Error("list refs of target pms_role failed.", zap.Error(err))
		return fmt.Errorf("list refs of pms_role failed")
	}
	for _, ref := range refs {
		if err = tx.Where("pms_role_ref_id=?", ref.ID).Delete(&PmsRoleRefGrant{}).Error; err != nil {
			elog.Error("delete PmsRoleRefGrant failed.", zap.Error(err))
			return fmt.Errorf("delete PmsRoleRefGrant error. ")
		}
	}

	// delete ref(s)
	if err = tx.Where("pms_role_id=?", pmsRoleId).Delete(&PmsRoleRef{}).Error; err != nil {
		elog.Error("delete PmsRoleRef failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleRef error. ")
	}

	// finally, delete pmsRole.
	if err = tx.Table(TableNamePmsRole).Where("id=?", pmsRoleId).Delete(&PmsRole{}).Error; err != nil {
		elog.Error("delete PmsRole error", zap.Error(err))
		return fmt.Errorf("delete PmsRole record failed. ")
	}
	return
}

func DeletePmsRoleRef(tx *gorm.DB, id int) (err error) {
	// delete grant first
	if err = tx.Where("pms_role_ref_id=?", id).Delete(&PmsRoleRefGrant{}).Error; err != nil {
		elog.Error("delete PmsRoleRefGrant of PmsRoleRef failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleRefGrant of PmsRoleRef error. ")
	}
	// delete target ref
	if err = tx.Where("id=?", id).Delete(&PmsRoleRef{}).Error; err != nil {
		elog.Error("delete PmsRoleRef failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleRef error. ")
	}
	return
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
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func GetCustomRolePmsList(conds Conds) (resp []*PmsCustomRole, err error) {
	sql, binds := BuildQuery(conds)
	if err = invoker.Db.Table(TableNamePmsCustomRole).Where(sql, binds...).Find(&resp).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		err = errors.Wrapf(err, "conds: %v", conds)
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
		elog.Error("delete customRole error", zap.Error(err))
		return
	}
	return
}

func PmsDefaultRoleDelete(paramId int) (err error) {
	if err = invoker.Db.Table(TableNamePmsDefaultRole).Where("id = ?", paramId).Delete(&PmsDefaultRole{}).Error; err != nil {
		elog.Error("delete defaultRole error", zap.Error(err))
		return
	}
	return
}

// TODO: caution with Default  and Custom role update! need compare act, subResource ant etc.
