package permission

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func (p *pms) transPmsRole2InstancePmsRole(pr *db.PmsRole, iid int) (resp *InstancePmsRole, err error) {
	if pr.BelongResource != pmsplugin.PrefixInstance {
		return resp, fmt.Errorf("pmsRole.BelongResource is not %s. ", pmsplugin.PrefixInstance)
	}
	details := make([]PmsRoleDetail, 0)
	for _, detail := range pr.Details {
		details = append(details, PmsRoleDetail{
			SubResources: detail.SubResources,
			Acts:         detail.Acts,
		})
	}
	resp = &InstancePmsRole{
		Id:       pr.ID,
		RoleType: pr.RoleType,
		Name:     pr.Name,
		Desc:     pr.Desc,
		Details:  details,
		Grant:    nil,
	}
	grant := make([]*InstancePmsRoleGrantItem, 0)

	invoker.Logger.Debug("pms", elog.Any("pr.Refs", pr.Refs))

	for _, ref := range pr.Refs {
		if ref.RefId != iid {
			continue
		}
		if len(ref.Grants) <= 0 {
			continue
		}
		var tmpMap = make(map[string]*InstancePmsRoleGrantItem) // {{"domStr": InstancePmsRoleGrantItem }
		for _, gt := range ref.Grants {
			invoker.Logger.Debug("pms", elog.Any("gt", gt))
			if gt.ObjectType != pmsplugin.PrefixUser {
				continue
			}
			var domStr string
			if gt.DomainType == "" {
				domStr = "*"
			} else {
				domStr = fmt.Sprintf("%s__%d", gt.DomainType, gt.DomainId)
			}
			if _, exist := tmpMap[domStr]; !exist {
				tmpMap[domStr] = &InstancePmsRoleGrantItem{
					Created: 1,
					Domain:  Trans2Domain4Fe(gt.DomainType, gt.DomainId),
					UserIds: make([]int, 0),
				}
			}
			tmpMap[domStr].UserIds = append(tmpMap[domStr].UserIds, gt.ObjectId)
		}
		for _, appPmsRoleGrantItem := range tmpMap {
			grant = append(grant, appPmsRoleGrantItem)
		}
	}
	resp.Grant = grant
	return resp, nil
}

// func getGrantResourcesFromPmsRole(pr *db.PmsRole) (resp []view.GrantResource) {
// 	resp = make([]view.GrantResource, 0)
// 	if len(pr.Refs) <= 0 {
// 		return
// 	}
// 	for _, ref := range pr.Refs {
// 		if len(ref.Grants) <= 0 {
// 			continue
// 		}
// 		gtRsrc := view.GrantResource{
// 			ResourceId: ref.RefId,
// 			GrantObjs:  make([]view.GrantObj, 0),
// 		}
// 		var tmpMap = make(map[string]map[string]view.GrantObj) // {"objType": {"domStr": GrantObj }}
// 		for _, gt := range ref.Grants {
// 			objType := gt.ObjectType
// 			if _, exist := tmpMap[objType]; !exist {
// 				tmpMap[objType] = make(map[string]view.GrantObj)
// 			}
// 			var domStr string
// 			if gt.DomainType == "" {
// 				domStr = "*"
// 			} else {
// 				domStr = fmt.Sprintf("%s__%d", gt.DomainType, gt.DomainId)
// 			}
// 			if _, exist := tmpMap[objType][domStr]; !exist {
// 				tmpMap[objType][domStr] = view.GrantObj{
// 					ObjectType: objType,
// 					GrantInfo: &view.GrantObjDetail{
// 						DomainType: gt.DomainType,
// 						DomainId:   gt.DomainId,
// 						ObjectIds:  make([]int, 0),
// 					},
// 				}
// 			}
// 			tmpMap[objType][domStr].GrantInfo.ObjectIds = append(tmpMap[objType][domStr].GrantInfo.ObjectIds, gt.ObjectId)
// 		}
// 		for _, domMap := range tmpMap {
// 			for _, gObj := range domMap {
// 				gtRsrc.GrantObjs = append(gtRsrc.GrantObjs, gObj)
// 			}
// 		}
// 		resp = append(resp, gtRsrc)
// 	}
// 	return
// }

// func (p *pms) GetResourceRolesGrantInfo(filter *view.RoleGrantInfoFilter) (*view.ResourceRolesGrantInfo, error) {
// 	var (
// 		res = view.ResourceRolesGrantInfo{
// 			ResourceType: filter.ResourceType,
// 			ResourceId:   filter.ResourceId,
// 			RolesGrant:   make([]view.RoleGrantInfo, 0),
// 		}
// 		err error
// 	)
// 	rolesWithGrant, err := p.getResourceRolesWithGrantInfo(filter)
// 	if err != nil {
// 		return nil, err
// 	}
// 	for _, role := range rolesWithGrant {
// 		roleGrantInfo := view.RoleGrantInfo{
// 			PmsRole:        role,
// 			GrantResources: getGrantResourcesFromPmsRole(role),
// 		}
// 		res.RolesGrant = append(res.RolesGrant, roleGrantInfo)
// 	}
// 	return &res, nil
// }

func (p *pms) GetInstanceRolesGrantInfo(filter *view.RoleGrantInfoFilter) (resp InstancePmsRolesWithGrantInfo, err error) {
	resp = InstancePmsRolesWithGrantInfo{
		Iid:   filter.ResourceId,
		Roles: make([]*InstancePmsRole, 0),
	}
	rolesWithGrant, err := p.getResourceRolesWithGrantInfo(filter)
	if err != nil {
		return resp, err
	}
	for _, roleWithGrant := range rolesWithGrant {
		role, err := p.transPmsRole2InstancePmsRole(roleWithGrant, filter.ResourceId)
		if err != nil {
			invoker.Logger.Error("trans pmsRole to frontStruct error.", zap.Error(err))
			continue
		}
		resp.Roles = append(resp.Roles, role)
	}
	invoker.Logger.Debug("pms", elog.Any("filter", filter), elog.Any("resp", resp))
	return resp, nil
}

func (p *pms) UpdateInstanceRolesGrantInfo(reqUpdateParam *InstancePmsRolesWithGrantInfo) (err error) {
	filter4ExistedPmsRole := view.RoleGrantInfoFilter{
		ResourceType:    pmsplugin.PrefixInstance,
		ResourceId:      reqUpdateParam.Iid,
		GrantObjectType: pmsplugin.PrefixUser,
	}
	existedAppRoles, err := p.GetInstanceRolesGrantInfo(&filter4ExistedPmsRole)
	if err != nil {
		return err
	}
	var (
		existAppRoleMap = make(map[int]*InstancePmsRole)
		// updateAppRoleMap = make(map[int]*InstancePmsRole)
	)
	for _, existRole := range existedAppRoles.Roles {
		existAppRoleMap[existRole.Id] = existRole
	}
	tx := invoker.Db.Begin()
	pmsplugin.EnforcerLock()
	defer pmsplugin.EnforcerUnlock()

	for _, updateRole := range reqUpdateParam.Roles {
		invoker.Logger.Debug("pms", elog.Any("updateRole", updateRole))

		oldAppRole, exist := existAppRoleMap[updateRole.Id]
		if !exist {
			// this condition should never happen, based on frontend logic
			invoker.Logger.Errorf("a pmsRole(Name:%s) which in reqUpdateAppRolesGrant params, is not existed in db, "+
				"when updating roles' grant of app(aid:%d). ", updateRole.Name, reqUpdateParam.Iid)
			continue
		}
		tgtPmsRole, err := db.PmsRoleInfoWithTgtRef(updateRole.Id, pmsplugin.PrefixInstance, reqUpdateParam.Iid)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			invoker.Logger.Errorf("get tgtPmsRole(id:%d) with Ref of app(id:%d) failed, skipped updating app grant info. %v",
				updateRole.Id, reqUpdateParam.Iid, err)
			continue
		}
		invoker.Logger.Debug("pms", elog.Any("oldAppRole", oldAppRole), elog.Any("tgtPmsRole", tgtPmsRole))

		// currentAppRole(wait2UpdateGrantInfo) existed in db, so just update grant from old to new
		err = p.updateAppRoleGrantFrom2(tx, oldAppRole, updateRole, tgtPmsRole, reqUpdateParam.Iid)
		if err != nil {
			// if update failed, rollback and return error.
			invoker.Logger.Errorf("Update appRole's grant error. %s", err.Error())
			tx.Rollback()
			return fmt.Errorf(" Update grant info of appRole(%s) error. ", oldAppRole.Name)
		}
		// update succeed, rm the updated appRole from the map.
		delete(existAppRoleMap, updateRole.Id)
	}
	// now the appRoles in existAppRoleMap are need to be delete.
	for _, wait2Del := range existAppRoleMap {
		tgtPmsRole, err := db.PmsRoleInfo(wait2Del.Id)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			tx.Rollback()
			return err
		}
		if tgtPmsRole.ID == 0 {
			tx.Rollback()
			return fmt.Errorf("target pmsRole not found. ")
		}
		switch wait2Del.RoleType {
		case db.PmsRoleTypeCustom:
			// custom pmsRole can be deleted directly.
			if err = p.deletePmsRole(tx, tgtPmsRole); err != nil {
				tx.Rollback()
				return err
			}
		case db.PmsRoleTypeDefault:
			// default pmsRole just delete corresponding Ref, do not delete pmsRole
			tgtPmsRoleRef, err := db.GetPmsRoleRefInfo(egorm.Conds{"pms_role_id": tgtPmsRole.ID, "ref_id": reqUpdateParam.Iid})
			if err != nil {
				tx.Rollback()
				invoker.Logger.Errorf("get Ref of target pmsRole failed. %v", err)
				return fmt.Errorf("get Ref of target pmsRole(id:%d) of app(id:%d) error", tgtPmsRole.ID, reqUpdateParam.Iid)
			}
			if err = p.pmsRoleDeleteRef(tx, tgtPmsRole, tgtPmsRoleRef); err != nil {
				tx.Rollback()
				return err
			}
		default:
			invoker.Logger.Warnf("RoleType(%d) of appPmsRole(%s) is invalid, skipped update its grant info",
				wait2Del.RoleType, wait2Del.Name)
			continue

		}
	}

	tx.Commit()
	pmsplugin.EnforcerLoadPolicy()
	return
}

// Note, the inputParams("from" and "to") should be the same pmsRole, the only thing that may be different is their grant
func (p *pms) updateAppRoleGrantFrom2(tx *gorm.DB, from *InstancePmsRole, to *InstancePmsRole, appPmsRole *db.PmsRole, aid int) (err error) {
	if aid <= 0 {
		return fmt.Errorf("invalid instance id. ")
	}
	if from.Id != to.Id {
		return fmt.Errorf("cannot update grant info between different appPmsRole")
	}
	if len(from.Grant) == 0 && len(to.Grant) == 0 {
		invoker.Logger.Debugf("the grant PmsRole(id:%d) of app(id:%d) from empty to empty, do nothing.", from.Id, aid)
		return nil
	}
	if len(to.Grant) == 0 {
		if err = p.pmsRoleDeleteRef(tx, appPmsRole, db.PmsRoleRef{
			PmsRoleId: appPmsRole.ID,
			RefId:     aid,
		}); err != nil {
			return err
		}
		invoker.Logger.Debugf("the grant PmsRole(id:%d) of app(id:%d) to empty, removed Ref.", from.Id, aid)
		return nil
	}
	var tgtPmsRoleRef db.PmsRoleRef
	if len(from.Grant) == 0 {
		tgtPmsRoleRef.PmsRoleId = appPmsRole.ID
		tgtPmsRoleRef.RefId = aid
		err = p.pmsRoleAddRef(tx, appPmsRole, &tgtPmsRoleRef)
		if err != nil {
			return err
		}
		// here do not return nil, need to run rest code.
	}
	// if goes here, need to process grant.
	// note if process grant, must have belonged pmsRoleRef, so check tgtRef first.
	if tgtPmsRoleRef.ID == 0 {
		tgtPmsRoleRef, err = db.GetPmsRoleRefInfo(egorm.Conds{"pms_role_id": appPmsRole.ID, "ref_id": aid})
		if err != nil {
			invoker.Logger.Errorf("get Ref of target pmsRole(id:%d) of app(id:%d) failed. %v", appPmsRole.ID, aid, err)
			return fmt.Errorf("get Ref of target pmsRole(id:%d) of app(id:%d) error", appPmsRole.ID, aid)
		}
	}
	var (
		addAppGrantLst = make([]*InstancePmsRoleGrantItem, 0) // wait to add in db
		delAppGrantLst = make([]*InstancePmsRoleGrantItem, 0) // wait to del from db
		newGrantMap    = make(map[string]*InstancePmsRoleGrantItem)
	)
	// trans "toPmsRole".Grant to newGrantMap. Note, must trans to.Grant, do not trans from.Grant to Map
	for _, newGrant := range to.Grant {
		newGrantDomStr := newGrant.Domain.ToString()
		// the "newGrant" which is submitted from fe is not valid, skip it
		if newGrantDomStr == "" {
			continue
		}
		// note, for a newGrant which its Created == 0, do not add it to "addGrantLst" directly, because its domain may
		// same with oldGrant, we cannot trust the data submitted from frontend.
		if _, exist := newGrantMap[newGrantDomStr]; !exist {
			newGrantMap[newGrantDomStr] = newGrant
		} else {
			// the "newGrants" which are submitted from fe may contains same domain, so need to merge.
			newGrantMap[newGrantDomStr].UserIds = append(newGrantMap[newGrantDomStr].UserIds, newGrant.UserIds...)
		}
	}
	invoker.Logger.Debug("pms", elog.Any("newGrantMap", newGrantMap))

	// compare and find out diffs. i.e. assemble "addGrantLst" and "delGrantLst". Note, the benchmark is "newGrants"
	for _, oldGrant := range from.Grant {
		oldGrantDomStr := oldGrant.Domain.ToString()
		if oldGrantDomStr == "" { // this condition should never happen
			continue
		}
		newGrant, exist := newGrantMap[oldGrantDomStr]
		if !exist {
			// benchmark is newGrant, so current oldGrant should be added to "delGrantLst"
			delAppGrantLst = append(delAppGrantLst, oldGrant)
			continue
		}
		// compare the userIds between oldGrant and newGrant
		isEqual, addUids, delUids := pmsplugin.CmpUserIds2GetNewAndRmUserIds(oldGrant.UserIds, newGrant.UserIds)
		if isEqual {
			delete(newGrantMap, oldGrantDomStr)
			continue
		}
		addAppGrantLst = append(addAppGrantLst, &InstancePmsRoleGrantItem{
			Domain:  newGrant.Domain,
			UserIds: addUids,
		})
		delAppGrantLst = append(delAppGrantLst, &InstancePmsRoleGrantItem{
			Domain:  oldGrant.Domain,
			UserIds: delUids,
		})
		delete(newGrantMap, oldGrantDomStr)
	}
	for _, newGrant := range newGrantMap {
		addAppGrantLst = append(addAppGrantLst, &InstancePmsRoleGrantItem{
			Domain:  newGrant.Domain,
			UserIds: newGrant.UserIds,
		})
	}
	invoker.Logger.Debug("pms", elog.Any("Deleting Grant", delAppGrantLst))
	invoker.Logger.Debug("pms", elog.Any("Adding Grant", addAppGrantLst))
	// add and del corresponding casbin gType rules(g or g3), and corresponding grant db record:
	// del:
	var (
		delDbGrant   []db.PmsRoleRefGrant
		grantObjType = pmsplugin.PrefixUser
	)

	for _, delAppGrant := range delAppGrantLst {
		pType := pmsplugin.RuleTypeG3
		domType, domId, err := delAppGrant.Domain.GetDomainTypeAndId()
		if err != nil {
			continue
		}
		if domType != "" {
			pType = pmsplugin.RuleTypeG
		}
		for _, uid := range delAppGrant.UserIds {
			delDbGrant = append(delDbGrant, db.PmsRoleRefGrant{
				PmsRoleRefId: tgtPmsRoleRef.ID,
				Ptype:        pType,
				ObjectType:   grantObjType,
				ObjectId:     uid,
				DomainType:   domType,
				DomainId:     domId,
			})
		}
	}
	err = p.pmsRoleProcessGrant("delete", tx, appPmsRole, &tgtPmsRoleRef, delDbGrant...)
	if err != nil {
		return
	}
	// add:
	var (
		addDbGrant []db.PmsRoleRefGrant
	)

	for _, addAppGrant := range addAppGrantLst {
		invoker.Logger.Debug("pms", elog.Any("addAppGrant", addAppGrant))

		pType := pmsplugin.RuleTypeG3
		domType, domId, err := addAppGrant.Domain.GetDomainTypeAndId()
		if err != nil {
			invoker.Logger.Error("pms", elog.Any("err", err.Error()), elog.Any("addAppGrant.Domain", addAppGrant.Domain))
			continue
		}
		if domType != "" {
			pType = pmsplugin.RuleTypeG
		}
		for _, uid := range addAppGrant.UserIds {
			addDbGrant = append(addDbGrant, db.PmsRoleRefGrant{
				PmsRoleRefId: tgtPmsRoleRef.ID,
				Ptype:        pType,
				ObjectType:   grantObjType,
				ObjectId:     uid,
				DomainType:   domType,
				DomainId:     domId,
			})
		}
	}
	invoker.Logger.Debug("pms", elog.Any("addDbGrant", addDbGrant))

	err = p.pmsRoleProcessGrant("add", tx, appPmsRole, &tgtPmsRoleRef, addDbGrant...)
	return
}

// func (p *pms) pmsRoleAddGrant(tx *gorm.DB, tgtPmsRole *db.PmsRole, tgtRef *db.PmsRoleRef, newGrant ...db.PmsRoleRefGrant) (err error) {
//
// }

func (p *pms) pmsRoleProcessGrant(action string, tx *gorm.DB, tgtPmsRole *db.PmsRole, tgtRef *db.PmsRoleRef, tgtGrant ...db.PmsRoleRefGrant) (err error) {
	// TODO check
	var (
		gRules  [][]string
		g3Rules [][]string
		ehRules []pmsplugin.EnhancedCasbinRulesItem
	)
	invoker.Logger.Debug("pms", elog.Any("step", "pmsRoleProcessGrant"), elog.Any("tgtGrant", tgtGrant))

	for _, grant := range tgtGrant {
		objStr := fmt.Sprintf("%s%s%d", grant.ObjectType, pmsplugin.SEP, grant.ObjectId)
		rStr := strings.Join([]string{pmsplugin.PrefixRole, strconv.Itoa(tgtPmsRole.ID), tgtPmsRole.BelongResource,
			strconv.Itoa(tgtRef.RefId)}, pmsplugin.SEP)
		if grant.DomainType == "" {
			g3Rules = append(g3Rules, []string{objStr, rStr})
		} else {
			domStr := fmt.Sprintf("%s%s%d", grant.DomainType, pmsplugin.SEP, grant.DomainId)
			gRules = append(gRules, []string{objStr, rStr, domStr})
		}
	}
	if len(gRules) > 0 {
		ehRules = append(ehRules, pmsplugin.EnhancedCasbinRulesItem{
			Ptype: pmsplugin.RuleTypeG,
			Rules: gRules,
		})
	}
	if len(g3Rules) > 0 {
		ehRules = append(ehRules, pmsplugin.EnhancedCasbinRulesItem{
			Ptype: pmsplugin.RuleTypeG3,
			Rules: g3Rules,
		})
	}

	switch action {
	case "add":
		for _, grant := range tgtGrant {
			invoker.Logger.Debug("pms", elog.Any("step", "add"), elog.Any("grant", grant))

			grant.ID = 0
			if err = tx.Create(&grant).Error; err != nil {
				return err
			}
		}
		err = pmsplugin.AddCasbinRules2Db(tx, ehRules)
	case "delete":
		for _, grant := range tgtGrant {
			err = tx.Where("pms_role_ref_id=? AND object_type=? AND object_id=? AND domain_type=? AND domain_id=?",
				tgtRef.ID, grant.ObjectType, grant.ObjectId, grant.DomainType, grant.DomainId).Delete(&grant).Error
			if err != nil {
				return
			}
		}
		err = pmsplugin.DelCasbinRulesFromDb(tx, ehRules)
	default:
		err = fmt.Errorf("invalid grant action(%s)", action)
	}
	return
}

func (p *pms) pmsRoleAddRef(tx *gorm.DB, tgtPmsRole *db.PmsRole, newRefs ...*db.PmsRoleRef) (err error) {
	if tgtPmsRole.RoleType == db.PmsRoleTypeCustom {
		if len(newRefs) <= 0 {
			return nil
		}
		if len(newRefs) > 1 {
			return fmt.Errorf("custom pmsRole can only have one Ref at most. ")
		}
		if tgtPmsRole.ResourceId != newRefs[0].RefId {
			return fmt.Errorf("custom pmsRole's resourceId must equal to newRef.refId ")
		}
	}
	var pRuleTpls []string
	for _, detail := range tgtPmsRole.Details {
		if detail.RuleTpl == "" {
			continue
		}
		pRuleTpls = append(pRuleTpls, detail.RuleTpl)
	}
	if len(pRuleTpls) <= 0 {
		return fmt.Errorf("target pmsRole has no detail(s), skip creating new Ref(s)")
	}
	for _, ref := range newRefs {
		if ref.PmsRoleId != tgtPmsRole.ID {
			invoker.Logger.Debugf("the newRef.pmsRoleId(%d) != tgtPmsRole.Id(%d), skipp adding...",
				ref.PmsRoleId, tgtPmsRole.ID)
			continue
		}
		existRef, err := db.GetPmsRoleRefInfo(egorm.Conds{"pms_role_id": tgtPmsRole.ID, "ref_id": ref.RefId})
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			invoker.Logger.Errorf("check tgtRef(ref_id:%d, pmsRoleId:%d) existence error. %v",
				ref.RefId, ref.PmsRoleId, err)
			return err
		}
		// already exist, continue
		if existRef.ID != 0 {
			ref.ID = existRef.ID
			invoker.Logger.Debugf("tgtRef(%+v) already exist, continue", existRef)
			continue
		}
		// 1. add p rule(s) first
		var pRules [][]string
		for _, pRuleTpl := range pRuleTpls {
			pRules = append(pRules, strings.Split(strings.ReplaceAll(pRuleTpl, db.RefId, strconv.Itoa(ref.RefId)), ","))
		}
		ehRule4Add := pmsplugin.EnhancedCasbinRulesItem{
			Ptype: pmsplugin.RuleTypeP,
			Rules: pRules,
		}
		err = pmsplugin.AddCasbinRules2Db(tx, []pmsplugin.EnhancedCasbinRulesItem{ehRule4Add})
		if err != nil {
			return fmt.Errorf("add casbin p rules while creating new PmsRoleRef failed. %w", err)
		}
		// 2. add ref to db
		ref.ID = 0
		invoker.Logger.Debugf("==> before create pmsRoleRef: ->%v<-", *ref)
		if err := tx.Create(ref).Error; err != nil {
			return fmt.Errorf("create new PmsRoleRef failed. %w", err)
		}
		invoker.Logger.Debugf("==> after create pmsRoleRef: ->%v<-", *ref)
	}
	return nil

}

// tgtPmsRole must has details
func (p *pms) pmsRoleDeleteRef(tx *gorm.DB, tgtPmsRole *db.PmsRole, delRefs ...db.PmsRoleRef) (err error) {
	if len(delRefs) <= 0 {
		return nil
	}
	// 1. delete db casbin record.
	// 1.1 find out all associated role strings
	var roleStrMap = make(map[string]struct{}) // in order to avoid duplicated items.
	for _, ref := range delRefs {
		if ref.PmsRoleId != tgtPmsRole.ID {
			continue
		}
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
	// 1.2. find out all casbin rules based on roleStrings
	var associatedEhRules = make([]pmsplugin.EnhancedCasbinRulesItem, 0)
	for roleStr, _ := range roleStrMap {
		ehRulesPt := pmsplugin.GetRulesByRole(roleStr, "")
		if len(*ehRulesPt) > 0 {
			associatedEhRules = append(associatedEhRules, *ehRulesPt...)
		}
	}
	// 1.3 delete associated casbin rules in db
	err = pmsplugin.DelCasbinRulesFromDb(tx, associatedEhRules)
	if err != nil {
		return err
	}
	// 2. delete ref in db
	for _, ref := range delRefs {
		if ref.PmsRoleId != tgtPmsRole.ID {
			continue
		}
		if ref.ID != 0 {
			if err := db.DeletePmsRoleRef(tx, ref.ID); err != nil {
				return err
			}
			continue
		}
		// ref.Id == 0, need to get target ref first, then use ref.id to delete
		tgtRef, err := db.GetPmsRoleRefInfo(egorm.Conds{"pms_role_id": tgtPmsRole.ID, "ref_id": ref.RefId})
		if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
			return err
		}
		if err := db.DeletePmsRoleRef(tx, tgtRef.ID); err != nil {
			return err
		}

	}
	return nil
}

// Get target resource("resourceType" and "resourceId" cannot be empty) roles grant info. i.e. PmsRoleList(with refs and grants info)
func (p *pms) getResourceRolesWithGrantInfo(filter *view.RoleGrantInfoFilter) (resp []*db.PmsRole, err error) {
	if _, valid := pmsplugin.PermittedPrefixMap[filter.ResourceType]; !valid {
		return nil, fmt.Errorf("invalid resourceType. ")
	}
	if filter.ResourceId <= 0 {
		return nil, fmt.Errorf("invalid resourceId")
	}
	var (
		grantConds = db.Conds{}
		refConds   = db.Conds{"ref_id": filter.ResourceId}
		roleConds  = db.Conds{"belong_resource": filter.ResourceType}
	)

	if filter.DomainType != "" {
		// check domain valid or not
		if _, valid := pmsplugin.PermittedDomPrefixMap[filter.DomainType]; !valid {
			return nil, fmt.Errorf("domainType is invalid. ")
		}
		if filter.DomainId <= 0 {
			return nil, fmt.Errorf("domainId is invalid. ")
		}
		// TODO: consider g3(which do not need domain)
		grantConds["domain_type"] = filter.DomainType
		grantConds["domain_id"] = filter.DomainId
	}
	if filter.GrantObjectType != "" {
		if _, valid := pmsplugin.PermittedPrefixMap[filter.GrantObjectType]; !valid {
			return nil, fmt.Errorf("invalid grantObjectType. ")
		}
		grantConds["object_type"] = filter.GrantObjectType
	}
	var (
		grantPreloadArgs = db.BuildPreloadArgs(grantConds)
		refPreloadArgs   = db.BuildPreloadArgs(refConds)
		roleSql          string
		binds            []interface{}
	)

	switch filter.RoleType {
	case db.PmsRoleTypeDefault:
		roleConds["role_type"] = filter.RoleType
		roleSql, binds = db.BuildQuery(roleConds)
	case db.PmsRoleTypeCustom:
		roleConds["role_type"] = filter.RoleType
		roleConds["resource_id"] = filter.ResourceId
		roleSql, binds = db.BuildQuery(roleConds)
	case 0:
		if _, exist := roleConds["role_type"]; exist {
			delete(roleConds, "role_type")
		}
		roleSql, binds = db.BuildQuery(roleConds)
		roleSql += fmt.Sprintf(" AND ((`role_type`=%d AND `resource_id`=%d) OR (`role_type`=%d AND `resource_id`=%d))",
			db.PmsRoleTypeDefault, 0, db.PmsRoleTypeCustom, filter.ResourceId)
	default:
		return nil, fmt.Errorf("invalid roleType(%d)", filter.RoleType)
	}

	err = invoker.Db.Preload("Refs", refPreloadArgs...).
		Preload("Refs.Grants", grantPreloadArgs...).
		Preload("Details").
		Where(roleSql, binds...).Find(&resp).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		invoker.Logger.Error("GetResourceRolesGrantInfo failed. ", zap.Error(err))
		return nil, fmt.Errorf("GetResourceRolesGrantInfo failed. ")
	}
	return resp, nil
}

func (p *pms) GetUserGrantedAppIds(uid int) (aids []int, err error) {
	var pmsRoleRefs []db.PmsRoleRef
	sql := "SELECT * FROM pms_role_ref Ref WHERE Ref.pms_role_id in (SELECT id FROM pms_role WHERE pms_role.belong_resource=?) " +
		"AND Ref.id in (SELECT pms_role_ref_id FROM pms_role_ref_grant RefG WHERE RefG.object_type=? AND RefG.object_id=?)"
	err = invoker.Db.Raw(sql, pmsplugin.PrefixInstance, pmsplugin.PrefixUser, uid).Scan(&pmsRoleRefs).Error
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		return nil, err
	}
	aids = make([]int, 0)
	if len(pmsRoleRefs) <= 0 {
		return aids, nil
	}
	for _, ref := range pmsRoleRefs {
		aids = append(aids, ref.RefId)
	}
	return
}
