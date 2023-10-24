package permission

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

func (p *pms) CheckPmsRole(role *db.PmsRole) (isValid bool, err error) {
	if err = role.IsDetailsValid(); err != nil {
		return false, err
	}

	if _, valid := pmsplugin.PermittedPrefixMap[role.BelongResource]; !valid {
		return false, errors.New("the belongType of newPmsRole is invalid")
	}
	if role.Name == "" {
		return false, errors.New("the name of newPmsRow cannot be empty!")
	}
	return true, nil
}

func (p *pms) CheckPmsRoleRefGrants(roleRef *db.PmsRoleRef) error {
	for _, grant := range roleRef.Grants {
		// check authorized object
		if grant.ObjectType == "" {
			return fmt.Errorf("grant objectType cannot be empty. ")
		}
		if _, exist := pmsplugin.PermittedPrefixMap[grant.ObjectType]; !exist {
			return fmt.Errorf("grant objectType is invalid. ")
		}

		// check domain:
		if grant.DomainType != "" {
			if grant.DomainId <= 0 {
				return fmt.Errorf("grant domainType is not empty, but domainId <= 0. ")
			}
			if _, exist := pmsplugin.PermittedDomPrefixMap[grant.DomainType]; !exist {
				return fmt.Errorf("grant domainType is invalid. ")
			}
			grant.Ptype = pmsplugin.RuleTypeG
		} else {
			if grant.DomainId > 0 {
				return fmt.Errorf("grant domainType is empty, but domainId > 0")
			}
			grant.Ptype = pmsplugin.RuleTypeG3
		}
	}
	return nil
}

/*
	CreatePmsRole: 创建权限角色(当前分为default和custom角色
*/

// GetPmsRoles: the response roles always contain defaultPmsRoles
func (p *pms) GetPmsRoles(reqParam *view.ReqPmsRoles) (respRoles []*db.PmsRole, err error) {
	query := make(egorm.Conds)
	if reqParam.Name != "" {
		query["name"] = egorm.Cond{
			Op:  "like",
			Val: reqParam.Name,
		}
	}
	if reqParam.BelongResource != "" {
		query["belong_resource"] = reqParam.BelongResource
	}
	// get default roles first
	query["role_type"] = db.PmsRoleTypeDefault
	respRoles, err = db.GetPmsRoleList(query)
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		elog.Errorf("get default pmsRole error. %s", err.Error())
		return nil, fmt.Errorf("get default pmsRole failed. ")
	}
	// if reqParam.ResourceId is not zero, need to get corresponding customRole(s)
	// Note if reqResourceId is not zero, reqBelongResource cannot be empty!
	if reqParam.ResourceId > 0 {
		if reqParam.BelongResource == "" {
			return nil, fmt.Errorf("belong_resource cannot be empty, when resource_id is not zero. ")
		}
		query["role_type"] = db.PmsRoleTypeCustom
		query["resource_id"] = reqParam.ResourceId
		customRoles, err := db.GetPmsRoleList(query)
		if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
			elog.Errorf("get custom pmsRole error. %s", err.Error())
			return nil, fmt.Errorf("get custom pmsRole failed. ")
		}
		respRoles = append(respRoles, customRoles...)
	}
	return respRoles, nil
}

func (p *pms) CreatePmsRole(newPmsRole *view.ReqNewPmsRole) (err error) {
	// 1. check newPmsRole.Details is valid or not
	isValid, err := p.CheckPmsRole(&newPmsRole.PmsRole)
	if !isValid {
		return errors.Errorf("reqNewPmsRole is not valid. %v", err)
	}
	// 2. check the existence of current pmsRoles with same belongResource, if role_type is defaultType
	if newPmsRole.RoleType == db.PmsRoleTypeDefault {
		sameRoles, err := db.GetPmsRoleList(egorm.Conds{
			"belong_resource": newPmsRole.BelongResource,
			"name":            newPmsRole.Name,
			"role_type":       newPmsRole.RoleType,
		})
		if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
			return fmt.Errorf("check existence of pms role failed. %w", err)
		}
		if len(sameRoles) > 0 {
			return fmt.Errorf("default role(%s) already existed. ", newPmsRole.Name)
		}
	}

	// 4. create in db. Note, do not create this pmsRole in casbin for all belongedResources
	return db.CreatePmsRole(invoker.Db, &newPmsRole.PmsRole)
}

// UpdatePmsRole: update a pmsRole "BASE INFO" by inputParam("updatePmsRole").
// Note, this function do not update pmsRole self Refs,
// but will use current pmsRole self Refs to generate corresponding p rules to update casbin rule.
// Require: PmsRole.Id not zero
func (p *pms) UpdatePmsRole(updatePmsRole *view.ReqUpdatePmsRole) (err error) {
	// 1. check target pmsRole exist or not
	existedPmsRole, err := db.PmsRoleInfo(updatePmsRole.ID)
	if err != nil {
		return fmt.Errorf("not found target pms_role by id %d", updatePmsRole.ID)
	}
	if updatePmsRole.RoleType != existedPmsRole.RoleType || updatePmsRole.BelongResource != existedPmsRole.BelongResource {
		return fmt.Errorf("the belongResource or roleType of pms_role cannot be changed after created. ")
	}
	if updatePmsRole.RoleType == db.PmsRoleTypeCustom && updatePmsRole.ResourceId != existedPmsRole.ResourceId {
		return fmt.Errorf("custom pmsRole's resourceId cannot be changed after created. ")
	}
	// 2. check newPmsRole.Details is valid or not
	isValid, err := p.CheckPmsRole(&updatePmsRole.PmsRole)
	if !isValid {
		return fmt.Errorf("reqUpdatePmsRole is not valid. %v", err)
	}
	// 3. prepare ruleTpl of details of updatePmsRole
	for idx, detail := range updatePmsRole.Details {
		updatePmsRole.Details[idx].RuleTpl, err = updatePmsRole.GenerateOnePRuleTplByDetail(detail)
		// updatePmsRole.Details[idx].RuleTpl, err = detail.GenerateRuleTpl(&updatePmsRole.PmsRole)
		if err != nil {
			return fmt.Errorf("generate ruleTpl of updatePmsRole.details failed. %w", err)
		}
	}
	// 4. find out diff ruleTpl between updatePmsRole and existedPmsRole.
	// 	  find out the details which need to be added and deleted. Note,
	//    Note, we using del and add two process to perform a update action.
	var ( // the key of map is the detail.ruleTpl
		delRuleTplDetailMap = make(map[string]*db.PmsRoleDetail) // which wait to be deleted in db
		addRuleTplDetailMap = make(map[string]*db.PmsRoleDetail) // which wait to be added in db
	)
	// 4.1 assemble the delRuleTplDetailMap based on the details of existedPmsRole first.
	for _, existedDetail := range existedPmsRole.Details {
		if _, exist := delRuleTplDetailMap[existedDetail.RuleTpl]; !exist {
			delRuleTplDetailMap[existedDetail.RuleTpl] = existedDetail
		}
	}
	// 4.2 remove items of delRuleTplDetailMap based on the detail.RuleTpl of updatePmsRole. meanwhile assemble addRuleTplDetailMap
	for _, updateDetail := range updatePmsRole.Details {
		if _, exist := delRuleTplDetailMap[updateDetail.RuleTpl]; exist {
			delete(delRuleTplDetailMap, updateDetail.RuleTpl)
		} else {
			updateDetail.ID = 0
			updateDetail.PmsRoleId = existedPmsRole.ID
			addRuleTplDetailMap[updateDetail.RuleTpl] = updateDetail
		}
	}
	// 5. start a transaction to update the details(delete and add) target pmsRole in db based on two maps, and pmsRole
	tx := invoker.Db.Begin()
	pmsplugin.EnforcerLock() // must lock before modify db record.
	defer pmsplugin.EnforcerUnlock()
	// 5.1 delete details first
	if len(delRuleTplDetailMap) > 0 {
		delIds := make([]int, 0)
		for _, detail := range delRuleTplDetailMap {
			delIds = append(delIds, detail.ID)
		}
		err := tx.Model(db.PmsRoleDetail{}).Where("id in (?)", delIds).Delete(&db.PmsRoleDetail{}).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("remove pmsDetails by id %v failed. ", delIds)
		}
	}
	// 5.2 add new details
	for _, newDetail := range addRuleTplDetailMap {
		if err := db.CreatePmsRoleDetail(tx, newDetail); err != nil {
			tx.Rollback()
			return fmt.Errorf("add new pmsDetail failed. ")
		}
	}
	// 5.3 update pmsRole
	if err := tx.Model(db.PmsRole{}).Where("id=?", existedPmsRole.ID).UpdateColumns(&(updatePmsRole.PmsRole)).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("update pmsRole self info failed. ")
	}
	// 6. update casbin rule based on delRuleTplDetailMap and addRuleTplDetailMap
	// 6.1 get associated refer resources id
	refs, err := db.GetPmsRoleRefList(egorm.Conds{"pms_role_id": existedPmsRole.ID})
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		tx.Rollback()
		return fmt.Errorf("get refers of pmsRole failed. ")
	}
	// 6.2 modify associated p rules in casbin
	var (
		delPRules [][]string
		addPRules [][]string
	)
	for _, ref := range refs {
		for delRuleTpl := range delRuleTplDetailMap {
			delPRules = append(delPRules, strings.Split(strings.ReplaceAll(delRuleTpl, db.RefId, strconv.Itoa(ref.RefId)), ","))
		}
		for addRuleTpl := range addRuleTplDetailMap {
			addPRules = append(addPRules, strings.Split(strings.ReplaceAll(addRuleTpl, db.RefId, strconv.Itoa(ref.RefId)), ","))
		}
	}
	ehRule4Del := pmsplugin.EnhancedCasbinRulesItem{
		Ptype: pmsplugin.RuleTypeP,
		Rules: delPRules,
	}
	err = pmsplugin.DelCasbinRulesFromDb(tx, []pmsplugin.EnhancedCasbinRulesItem{ehRule4Del})
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("remove casbin p rules from db based on pmsRole details failed. %w", err)
	}
	ehRule4Add := pmsplugin.EnhancedCasbinRulesItem{
		Ptype: pmsplugin.RuleTypeP,
		Rules: addPRules,
	}
	err = pmsplugin.AddCasbinRules2Db(tx, []pmsplugin.EnhancedCasbinRulesItem{ehRule4Add})
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("add casbin p rules to db based on pmsRole details failed. %w", err)
	}
	tx.Commit()
	// do not forget to reload casbin policy, because we just modified records in db above.
	pmsplugin.EnforcerLoadPolicy()
	return nil
}

// DeletePmsRole: delete a pmsRole by inputParam("updatePmsRole")
// Require: PmsRole.Id not zero
func (p *pms) deletePmsRole(tx *gorm.DB, tgtPmsRole *db.PmsRole) (err error) { // TODO change to private func and move step1 to invoker
	// 1. find out all associated role strings
	var roleStrMap = make(map[string]struct{}) // in order to avoid duplicated items.
	for _, ref := range tgtPmsRole.Refs {
		for _, detail := range tgtPmsRole.Details {
			pRule := strings.Split(strings.ReplaceAll(detail.RuleTpl, db.RefId, strconv.Itoa(ref.RefId)), ",")
			if len(pRule) < 4 {
				// skip invalid pRule
				continue
			}
			if _, exist := roleStrMap[pRule[0]]; !exist {
				roleStrMap[pRule[0]] = struct{}{}
			}
		}
	}
	// 2. find out all casbin rules based on roleStrings
	var associatedEhRules = make([]pmsplugin.EnhancedCasbinRulesItem, 0)
	for roleStr := range roleStrMap {
		ehRulesPt := pmsplugin.GetRulesByRole(roleStr, "")
		if len(*ehRulesPt) > 0 {
			associatedEhRules = append(associatedEhRules, *ehRulesPt...)
		}
	}
	// 3. deleting
	// 3.1 delete casbin rules in db
	err = pmsplugin.DelCasbinRulesFromDb(tx, associatedEhRules)
	if err != nil {
		return err
	}
	// 3.2 delete pmsRole in db
	err = db.DeletePmsRoleById(tx, tgtPmsRole.ID)
	if err != nil {
		return err
	}
	return nil
}

func (p *pms) DeletePmsRole(delPmsRole *view.ReqDeletePmsRole) (err error) { // TODO change to private func and move step1 to invoker
	// check target pmsRole exist or not
	existedPmsRole, err := db.PmsRoleInfo(delPmsRole.ID)
	if err != nil {
		return fmt.Errorf("not found target pms_role by id %d", delPmsRole.ID)
	}
	// before invoke private function, we must start transaction and lock casbin
	tx := invoker.Db.Begin()
	// note, when processing the data in db, we need to lock
	pmsplugin.EnforcerLock()
	defer pmsplugin.EnforcerUnlock()
	err = p.deletePmsRole(tx, existedPmsRole)
	if err != nil {
		tx.Rollback()
		return err
	}
	tx.Commit()
	// load policy manually
	pmsplugin.EnforcerLoadPolicy()
	return nil
}
