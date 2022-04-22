package db

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/gotomicro/ego-component/egorm"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/utils"
)

const (
	PmsRoleTypeUnknown = iota
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
//    role__{{PmsRole:Id}}__{{PmsRole:BelongResource}}__{{ID}},{{PmsRole:BelongResource}}__{{ID}}__subResource__(SubResourceRegex),ActsRegex,*
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
		invoker.Logger.Error("get pms_role by id failed.", zap.Error(err))
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
		invoker.Logger.Error("Get pms_role list error", zap.Error(err))
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

func GetPmsRoleDetailList(conds egorm.Conds) (resp []*PmsRoleDetail, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNamePmsRoleDetail).Where(sql, binds...).Find(&resp).Error; err != nil {
		invoker.Logger.Error("Get pms_role_detail list error", zap.Error(err))
		return
	}
	return
}

// for resp, default do not contain grants info
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
		invoker.Logger.Error("Create pms_role error", zap.Error(err))
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
			invoker.Logger.Error("Create pms_role_detail error", zap.Error(err))
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
		invoker.Logger.Error("create pms_role_detail error", zap.Error(err))
		return
	}
	return
}

func CreatePmsRoleRef(db *gorm.DB, data *PmsRoleRef) (err error) {
	if err = db.Model(data).Create(data).Error; err != nil {
		invoker.Logger.Error("create pms_role_ref error", zap.Error(err))
		return
	}
	return
}

// not allow update pms_role_id column of PmsRoleDetail
func UpdatePmsRoleDetail(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	if _, exist := ups["pms_role_id"]; exist {
		return fmt.Errorf("column pms_role_id of PmsRoleDetail cannot be changed in updating. ")
	}
	if err = db.Table(TableNamePmsRoleDetail).Where("id = ?", id).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update pms_role error", zap.Error(err))
		return
	}
	return
}

// please make sure the associated casbinRules have removed after deleted pmsRole. do not only invoke this func to delete pmsRole.
func DeletePmsRoleById(tx *gorm.DB, pmsRoleId int) (err error) {
	// delete detail(s) first
	if err = tx.Where("pms_role_id=?", pmsRoleId).Delete(&PmsRoleDetail{}).Error; err != nil {
		invoker.Logger.Error("delete PmsRoleDetail failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleDetail error. ")
	}

	// delete grant of each ref
	refs, err := GetPmsRoleRefList(egorm.Conds{"pms_role_id": pmsRoleId})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		invoker.Logger.Error("list refs of target pms_role failed.", zap.Error(err))
		return fmt.Errorf("list refs of pms_role failed")
	}
	for _, ref := range refs {
		if err = tx.Where("pms_role_ref_id=?", ref.ID).Delete(&PmsRoleRefGrant{}).Error; err != nil {
			invoker.Logger.Error("delete PmsRoleRefGrant failed.", zap.Error(err))
			return fmt.Errorf("delete PmsRoleRefGrant error. ")
		}
	}

	// delete ref(s)
	if err = tx.Where("pms_role_id=?", pmsRoleId).Delete(&PmsRoleRef{}).Error; err != nil {
		invoker.Logger.Error("delete PmsRoleRef failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleRef error. ")
	}

	// finally, delete pmsRole.
	if err = tx.Table(TableNamePmsRole).Where("id=?", pmsRoleId).Delete(&PmsRole{}).Error; err != nil {
		invoker.Logger.Error("delete PmsRole error", zap.Error(err))
		return fmt.Errorf("delete PmsRole record failed. ")
	}
	return
}

func DeletePmsRoleDetailById(db *gorm.DB, id int) (err error) {
	if err = db.Table(TableNamePmsRoleDetail).Delete(&PmsRoleDetail{}, id).Error; err != nil {
		invoker.Logger.Error("pms_role_detail delete error", zap.Error(err))
		return
	}
	return
}

func DeletePmsRoleRef(tx *gorm.DB, id int) (err error) {
	// delete grant first
	if err = tx.Where("pms_role_ref_id=?", id).Delete(&PmsRoleRefGrant{}).Error; err != nil {
		invoker.Logger.Error("delete PmsRoleRefGrant of PmsRoleRef failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleRefGrant of PmsRoleRef error. ")
	}
	// delete target ref
	if err = tx.Where("id=?", id).Delete(&PmsRoleRef{}).Error; err != nil {
		invoker.Logger.Error("delete PmsRoleRef failed.", zap.Error(err))
		return fmt.Errorf("delete PmsRoleRef error. ")
	}
	return
}
