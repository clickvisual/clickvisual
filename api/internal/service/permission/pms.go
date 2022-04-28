package permission

import (
	"fmt"
	"strconv"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type pms struct{}

var Manager *pms

func InitManager() {
	pmsplugin.Invoker()
	Manager = &pms{}
}

func (p *pms) AddUsers2AppRoles(rolesWithUsers *[]view.AppRoleInfoItem) {
	if rolesWithUsers == nil {
		return
	}
	for _, roleItem := range *rolesWithUsers {
		if roleItem.BelongType != pmsplugin.PrefixInstance || roleItem.RoleName == "" || roleItem.ReferId == 0 || len(roleItem.Uids) == 0 {
			continue
		}
		if roleItem.DomainType != "" && roleItem.DomainId != 0 {
			// need dom, so using g rule
			domStr, err := pmsplugin.Assemble2CasbinStr(roleItem.DomainType, strconv.Itoa(roleItem.DomainId))
			if err != nil {
				invoker.Logger.Warn("found invalid domStr, stop assigning users App role by g.",
					zap.String("domType", roleItem.DomainType), zap.Int("domId", roleItem.DomainId),
					zap.Int("appId", roleItem.ReferId), zap.String("roleName", roleItem.RoleName),
					zap.Error(err))
				continue
			}
			roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, roleItem.RoleName, roleItem.BelongType, strconv.Itoa(roleItem.ReferId))
			for _, uid := range roleItem.Uids {
				userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(uid))
				_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeG, userStr, roleStr, domStr)
			}
		} else {
			// using g3 rule to ignore dom
			roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, roleItem.RoleName, roleItem.BelongType, strconv.Itoa(roleItem.ReferId))
			for _, uid := range roleItem.Uids {
				userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(uid))
				_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeG3, userStr, roleStr)
			}
		}
	}
}

// AssignRoles2User - assign roles to specific user
func (p *pms) AssignRoles2User(userId string, reqRoles []view.RoleItem) (err error) {
	if userId == "" {
		return errors.New("userId cannot be empty")
	}
	userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, userId)
	for _, roleItem := range reqRoles {
		roleStr, err := pmsplugin.GetValidRoleStrByRoleItem(roleItem)
		if err != nil {
			invoker.Logger.Warn("invalid roleString", zap.Error(err))
			continue
		}
		var gType = pmsplugin.RuleTypeG3
		var targetDom string
		if roleItem.DomainType != "" {
			targetDom, err = pmsplugin.Assemble2CasbinStr(roleItem.DomainType, strconv.Itoa(roleItem.DomainId))
			if err != nil {
				invoker.Logger.Warn("invalid dom format", zap.Error(err))
				continue
			}
			gType = pmsplugin.RuleTypeG
		}
		if _, err := pmsplugin.AddRule(gType, userStr, roleStr, targetDom); err != nil {
			invoker.Logger.Warn("assign role to user error", zap.String("role", roleStr), zap.Error(err))
		}
	}
	return nil
}

// AssignTableRolesUser:  re-assign users to all roles of app, based on the list of AppRoleUsersItem
func (p *pms) AssignTableRolesUser(appId int, reqAppRolesWithUsers []view.AppRoleInfoItem) {
	if appId <= 0 {
		return
	}
	var appRolesUser []view.AppRoleInfoItem
	for _, appRole := range reqAppRolesWithUsers {
		if appRole.BelongType != pmsplugin.PrefixInstance || appRole.RoleName == "" || len(appRole.Uids) == 0 {
			continue
		}
		appRolesUser = append(appRolesUser, appRole)
	}
	p.OverwriteAppRolesUser(appId, appRolesUser)

}

func (p *pms) AssignConfigResourceRolesUser(configResourceName string) {

}

func (p *pms) CheckNormalPermission(reqPms view.ReqPermission) error {
	checker := p.newUserPmsCheckStrategy(reqPms.ObjectType, reqPms.SubResource)
	return checker.Check(reqPms)
}

/*
CratedDefaultRolePms && DeleteDefaultRolePms:
	在default_role_table中创建record的同时, 需要在casbin给所有belongType类型的资源都添加p规则, 删除时同理需要都移除对应的p和相关的g g3
	同时 注意保持default_role_table 的唯一性; 另外也要兼顾custom_role_table中的record, 不能重名, 否则custom_role会不起作用.
CreateCustomRolePms && DeleteCustomRolePms:
	 注意: 在除了保证custom_role_table内的唯一性之前, 需要先去检查default_role_table中是否含有了欲添加role!!!!
	同理, 在对custom_role_table内增删record时, 需要在casbin中增p 和 删p,g, g3
*/

func (p *pms) CreateDefaultRolePms(newDefaultRole *view.DefaultRolePms) (err error) {
	if _, valid := pmsplugin.PermittedPrefixMap[newDefaultRole.BelongType]; !valid {
		return errors.New("the belongType of new default role is invalid")
	}
	if newDefaultRole.RoleName == "" {
		return errors.New("the roleName cannot be empty!")
	}

	// check the existence of current default roles, if already exist, then need to check the equality of subResource
	searchDefaultRes, err := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": newDefaultRole.BelongType,
		"role_name":   newDefaultRole.RoleName,
	})
	if err != nil {
		return errors.Wrap(err, "check existence of default role failed.")
	}
	if len(searchDefaultRes) > 0 {
		// check the subResource
		for _, dbDefaultRole := range searchDefaultRes {
			if pmsplugin.IsStringSliceEqual(dbDefaultRole.SubResources, newDefaultRole.SubResources) {
				// TODO: overwrite dbDefaultRole.Acts ?
				return errors.New("the role already exist.")
			}
		}
	}
	// 2. check if the customRole already has the role with same belongType and roleName, if exist, will return error
	searchCustomRes, err := db.GetCustomRolePmsList(db.Conds{
		"belong_type": newDefaultRole.BelongType,
		"role_name":   newDefaultRole.RoleName,
	})
	if err != nil {
		return errors.Wrap(err, "check existence of custom role failed.")
	}

	if len(searchCustomRes) > 0 {
		// TODO: support force overwrite?
		referIds := make([]int, 0)
		for _, custRes := range searchCustomRes {
			referIds = append(referIds, custRes.ReferId)
		}
		return errors.Errorf("the role(%s) already exist in customRole of %s_id(s) %v", newDefaultRole.RoleName,
			newDefaultRole.BelongType, referIds)
	}
	/*
		3. add p rules for all of current belong_type resources
			note that, defaultRolePms is associate with p rules in casbin.
	*/
	// 3.1 pre-process the p rules
	var pRulesField01NotDone [][]string
	var p0RoleTpl, _ = pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, newDefaultRole.RoleName, newDefaultRole.BelongType, "%s")
	var p2Act = pmsplugin.JointActs2RuleActStr(newDefaultRole.Acts...)
	var p3Dom = "*"
	for _, resrc := range newDefaultRole.SubResources {
		p1SubResrcTpl, _ := pmsplugin.Assemble2CasbinStr(newDefaultRole.BelongType, "%s", pmsplugin.PrefixSubRsrc, resrc)
		pRulesField01NotDone = append(pRulesField01NotDone, []string{p0RoleTpl, p1SubResrcTpl, p2Act, p3Dom})
	}
	// 3.2 find all items of belongType, and add p rules for item, current only support app
	var pRuleAdded = false
	switch newDefaultRole.BelongType {
	case pmsplugin.PrefixInstance:
		instances, err := db.InstanceList(egorm.Conds{})
		if err != nil {
			return errors.Wrap(err, "get apps failed, stop adding p rules for app")
		}
		for _, ins := range instances {
			for _, pR := range pRulesField01NotDone {
				// just add p rules, if the p rule exist, will not be added.
				_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeP, fmt.Sprintf(pR[0], strconv.Itoa(ins.ID)),
					fmt.Sprintf(pR[1], strconv.Itoa(ins.ID)), pR[2], pR[3])
			}
		}
		pRuleAdded = true

	default:
		return errors.Errorf("Not support add defaultRole for %s resource type currently", newDefaultRole.BelongType)
	}
	// 4. finally, if p rule(s) added in casbin then add this new default role in db.
	if pRuleAdded {
		if err := db.PmsDefaultRoleCreate(&(newDefaultRole.PmsDefaultRole)); err != nil {
			return err
		}
	}
	return nil

}

func (*pms) CreateCustomRolePms(newCustomRole view.CustomRolePms) (err error) {
	if _, valid := pmsplugin.PermittedPrefixMap[newCustomRole.BelongType]; !valid {
		return errors.New("the belongType of new default role is invalid")
	}
	if newCustomRole.RoleName == "" {
		return errors.New("the roleName cannot be empty")
	}
	if newCustomRole.ReferId == 0 {
		return errors.New("the referId cannot be empty")
	}

	// check the existence of current default roles, if already exist, then return error
	searchDefaultRes, err := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": newCustomRole.BelongType,
		"role_name":   newCustomRole.RoleName,
	})
	if err != nil {
		return errors.Wrap(err, "check existence of default role failed.")
	}
	if len(searchDefaultRes) > 0 {
		// do not compare further. because different role
		return errors.New("same role already exist in default role.")
	}
	// 2. check the existence of customRole,
	searchCustomRes, err := db.GetCustomRolePmsList(db.Conds{
		"belong_type": newCustomRole.BelongType,
		"role_name":   newCustomRole.RoleName,
		"refer_id":    newCustomRole.ReferId,
	})
	if err != nil {
		return errors.Wrap(err, "check existence of custom role failed.")
	}
	// if exist
	if len(searchCustomRes) > 0 {
		// need check the equality further
		for _, dbCustomRole := range searchCustomRes {
			if pmsplugin.IsStringSliceEqual(dbCustomRole.SubResources, newCustomRole.SubResources) {
				return errors.Errorf("the customRole(%s) already exist", newCustomRole.RoleName)
			}
		}
	}
	/*
		3. add p rules for target refer belong_type resource
			note that, CustomRole is associate with p rules in casbin.
	*/
	// 3.1 pre-process the p rules
	var pRules = [][]string{}
	var p0Role, _ = pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, newCustomRole.RoleName,
		newCustomRole.BelongType, strconv.Itoa(newCustomRole.ReferId))
	var p2Act = pmsplugin.JointActs2RuleActStr(newCustomRole.Acts...)
	var p3Dom = "*"
	for _, resrc := range newCustomRole.SubResources {
		p1Resrc, _ := pmsplugin.Assemble2CasbinStr(newCustomRole.BelongType, strconv.Itoa(newCustomRole.ReferId),
			pmsplugin.PrefixSubRsrc, resrc)
		pRules = append(pRules, []string{p0Role, p1Resrc, p2Act, p3Dom})
	}
	// 3.2 check the existence of target belongType resource, then add p rules for it, current only support app
	var pRuleAdded = false
	switch newCustomRole.BelongType {
	case pmsplugin.PrefixInstance:
		instances, err := db.InstanceList(egorm.Conds{"id": newCustomRole.ReferId})
		if err != nil {
			return errors.Wrap(err, "get target app failed, stop adding p rules for app")
		}
		if len(instances) == 0 {
			return errors.New("target app not exist, stop adding p rules of custom role for it.")
		}
		for _, pR := range pRules {
			// just add p rules, if the p rule exist, will not be added.
			_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeP, pR[0], pR[1], pR[2], pR[3])
		}
		pRuleAdded = true
	default:
		return errors.Errorf("Not support add customRole for %s resource type currently", newCustomRole.BelongType)
	}
	// 4. finally, if p rule(s) added in casbin then add this new custom role in db.
	if pRuleAdded {
		if err := db.PmsCustomRoleCreate(&(newCustomRole.PmsCustomRole)); err != nil {
			return err
		}
	}
	return nil

}

// delete DefaultRole function
func (p *pms) DeleteDefaultRolePms(delDefaultRole view.DefaultRolePms) (err error) {
	if _, valid := pmsplugin.PermittedPrefixMap[delDefaultRole.BelongType]; !valid {
		return errors.New("the belongType of default role is invalid, stop deleting")
	}
	if delDefaultRole.RoleName == "" {
		return errors.New("the roleName of default role cannot be empty, stop deleting")
	}

	// check the existence in current default roles, if not exist, then return error
	currentDefaultRoles, err := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": delDefaultRole.BelongType,
		"role_name":   delDefaultRole.RoleName,
	})
	if err != nil {
		return errors.Wrap(err, "check existence in current default roles failed.")
	}
	if len(currentDefaultRoles) == 0 {
		return errors.New("not found target default role in db, do not need to delete")
	}
	/*
		3. assemble not complete p rules based on default role, then remove all those p rules for belongType resources
	*/
	// 3.1 pre-process the p rules
	var pRulesField01NotDone = [][]string{}
	var p0RoleTpl, _ = pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, delDefaultRole.RoleName, delDefaultRole.BelongType, "%s")
	var p3Dom = "*"
	// Note using subResources of currentDefaultRoles(which got from db),
	// do not using the input param DelDefaultRole(which maybe a partial subResources, perhaps leave unused rules in casbin)
	for _, dbDefaultRole := range currentDefaultRoles {
		var p2Act = pmsplugin.JointActs2RuleActStr(dbDefaultRole.Acts...)
		for _, resrc := range dbDefaultRole.SubResources {
			p1SubResrcTpl, _ := pmsplugin.Assemble2CasbinStr(dbDefaultRole.BelongType, "%s", pmsplugin.PrefixSubRsrc, resrc)
			pRulesField01NotDone = append(pRulesField01NotDone, []string{p0RoleTpl, p1SubResrcTpl, p2Act, p3Dom})
		}
	}
	// 3.2 find all items of belongType, and remove p, g, g3 rules for item, current only support app
	var rulesDeleted = false
	switch delDefaultRole.BelongType {
	case pmsplugin.PrefixInstance:
		instances, err := db.InstanceList(egorm.Conds{})
		if err != nil {
			return errors.Wrap(err, "get apps failed, stop removing p rules of default role for app")
		}
		for _, ins := range instances {
			currentAppRoleStr := fmt.Sprintf(p0RoleTpl, strconv.Itoa(ins.ID))
			// remove g and g3 rules first
			ehRules := pmsplugin.GetRulesByRole(currentAppRoleStr, "")
			if len(*ehRules) > 0 {
				for _, ehRule := range *ehRules {
					for _, rule := range ehRule.Rules {
						iRule := make([]interface{}, len(rule))
						for i, v := range rule {
							iRule[i] = v
						}
						_, _ = pmsplugin.DelRule(ehRule.Ptype, iRule...)
					}
				}
			}
			// remove p rules
			for _, pR := range pRulesField01NotDone {
				// just remove p rules, do not need to check the existence of p rule
				_, _ = pmsplugin.DelRule(pmsplugin.RuleTypeP, fmt.Sprintf(pR[0], strconv.Itoa(ins.ID)),
					fmt.Sprintf(pR[1], strconv.Itoa(ins.ID)), pR[2], pR[3])
			}
		}
		rulesDeleted = true

	default:
		return errors.Errorf("Not support remove defaultRole for %s resource type currently", delDefaultRole.BelongType)
	}

	if rulesDeleted {
		for _, dbDefaultRole := range currentDefaultRoles {
			if err := db.PmsDefaultRoleDelete(int(dbDefaultRole.ID)); err != nil {
				invoker.Logger.Error("delete defaultRole db record error", zap.Error(err))
			}
		}
	}
	return nil
}

// delete CustomRole function
func (p *pms) DeleteCustomRolePms(delCustomRole view.CustomRolePms) (err error) {
	if _, valid := pmsplugin.PermittedPrefixMap[delCustomRole.BelongType]; !valid {
		return errors.New("the belongType of custom role is invalid, stop deleting")
	}
	if delCustomRole.RoleName == "" {
		return errors.New("the roleName of custom role cannot be empty, stop deleting")
	}
	if delCustomRole.ReferId == 0 {
		return errors.New("the id of refer obj of custom role cannot be 0, stop deleting")
	}
	// check the existence in current custom roles, if not exist, then return error
	currentCustomRoles, err := db.GetCustomRolePmsList(db.Conds{
		"belong_type": delCustomRole.BelongType,
		"role_name":   delCustomRole.RoleName,
		"refer_id":    delCustomRole.ReferId,
	})
	if err != nil {
		return errors.Wrap(err, "check existence in current custom roles failed.")
	}
	if len(currentCustomRoles) == 0 {
		return errors.New("not found target custom role in db, do not need to delete")
	}
	/*
		3. assemble p rules based on searched custom role, then remove all those p rules for target resource
	*/
	// 3.1 pre-process the p rules
	var pRules = [][]string{}
	var p0Role, _ = pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, delCustomRole.RoleName, delCustomRole.BelongType, strconv.Itoa(delCustomRole.ReferId))
	var p3Dom = "*"
	// Note using subResources of currentCustomRoles(which got from db),
	// do not using the input param delCustomRole(which maybe a partial subResources, perhaps leave unused rules in casbin)
	for _, dbCustomRole := range currentCustomRoles {
		var p2Act = pmsplugin.JointActs2RuleActStr(dbCustomRole.Acts...)
		for _, resrc := range dbCustomRole.SubResources {
			p1SubResrc, _ := pmsplugin.Assemble2CasbinStr(dbCustomRole.BelongType, strconv.Itoa(dbCustomRole.ReferId),
				pmsplugin.PrefixSubRsrc, resrc)
			pRules = append(pRules, []string{p0Role, p1SubResrc, p2Act, p3Dom})
		}
	}
	// 3.2 do the remove process
	// 3.2.1 remove related g and g3 rules first
	ehRules := pmsplugin.GetRulesByRole(p0Role, "")
	if len(*ehRules) > 0 {
		for _, ehRule := range *ehRules {
			for _, rule := range ehRule.Rules {
				iRule := make([]interface{}, len(rule))
				for i, v := range rule {
					iRule[i] = v
				}
				_, _ = pmsplugin.DelRule(ehRule.Ptype, iRule...)
			}
		}
	}
	// 3.2.2 remove related p rules
	for _, pR := range pRules {
		// just remove p rules, do not need to check the existence of p rule
		_, _ = pmsplugin.DelRule(pmsplugin.RuleTypeP, pR[0], pR[1], pR[2], pR[3])
	}

	// 4. finally, delete custom role in db.
	for _, dbCustomRole := range currentCustomRoles {
		if err := db.PmsCustomRoleDelete(int(dbCustomRole.ID)); err != nil {
			invoker.Logger.Error("delete customRole db record error", zap.Error(err))
		}
	}
	return nil
}

func (p *pms) DelUsersFromAppRoles(rolesWithUsers *[]view.AppRoleInfoItem) {
	if rolesWithUsers == nil {
		return
	}
	for _, roleItem := range *rolesWithUsers {
		if roleItem.BelongType != pmsplugin.PrefixInstance || roleItem.RoleName == "" || roleItem.ReferId == 0 || len(roleItem.Uids) == 0 {
			continue
		}
		if roleItem.DomainType != "" && roleItem.DomainId != 0 {
			// need dom, so using g rule
			domStr, err := pmsplugin.Assemble2CasbinStr(roleItem.DomainType, strconv.Itoa(roleItem.DomainId))
			if err != nil {
				invoker.Logger.Warn("found invalid domStr, stop remove users App role by g.",
					zap.String("domType", roleItem.DomainType), zap.Int("domId", roleItem.DomainId),
					zap.Int("appId", roleItem.ReferId), zap.String("roleName", roleItem.RoleName),
					zap.Error(err))
				continue
			}
			roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, roleItem.RoleName, roleItem.BelongType, strconv.Itoa(roleItem.ReferId))
			for _, uid := range roleItem.Uids {
				userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(uid))
				_, _ = pmsplugin.DelRule(pmsplugin.RuleTypeG, userStr, roleStr, domStr)
			}
		} else {
			// using g3 rule to ignore dom
			roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, roleItem.RoleName, roleItem.BelongType, strconv.Itoa(roleItem.ReferId))
			for _, uid := range roleItem.Uids {
				userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(uid))
				_, _ = pmsplugin.DelRule(pmsplugin.RuleTypeG3, userStr, roleStr)
			}
		}
	}
}

/*
EnsureResourceHasDefaultRoles:
Params:
	resourceType: current only support "app" or "configResource"
	resourceIdx: appId or configResourceName
*/
func (*pms) EnsureResourceHasDefaultRoles(resourceType string, resourceIdx string) (err error) {
	if resourceIdx == "" || resourceType == "" {
		return errors.New("resourceType or resourceIdx cannot be empty")
	}
	switch resourceType {
	case pmsplugin.PrefixInstance:
		// 1. ensure input param resourceIdx is a valid appId
		insId, err := strconv.Atoi(resourceIdx)
		if err != nil {
			return fmt.Errorf("resourceIdx is an invalid appId, error: %s", err.Error())
		}
		// 2. check the existence of target app based on resourceIdx(i.e. appId)
		targetInstanceList, err := db.InstanceList(egorm.Conds{
			"id": insId,
		})
		if err != nil || len(targetInstanceList) <= 0 {
			return fmt.Errorf("not found target app based on resourceIdx(appId) %s", resourceIdx)
		}
		// 3. check the existence of "app" type defaultRole
		defaultRolePmsList, _ := db.GetDefaultRolePmsList(db.Conds{
			"belong_type": pmsplugin.PrefixInstance,
		})
		if len(defaultRolePmsList) <= 0 {
			return fmt.Errorf("not found any %s type roles currently", pmsplugin.PrefixInstance)
		}
		// 4. add new p rules for target app based on "app" type defaultRoles
		for _, appDefaultRolePms := range defaultRolePmsList {
			var pRules [][]string
			var p0Role, _ = pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, appDefaultRolePms.RoleName, pmsplugin.PrefixInstance, resourceIdx)
			var p2Act = pmsplugin.JointActs2RuleActStr(appDefaultRolePms.Acts...)
			var p3Dom = "*"
			for _, resrc := range appDefaultRolePms.SubResources {
				p1SubResrc, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixInstance, resourceIdx, pmsplugin.PrefixSubRsrc, resrc)
				pRules = append(pRules, []string{p0Role, p1SubResrc, p2Act, p3Dom})
			}
			for _, pR := range pRules {
				// just add p rules, if the p rule exist, will not be added.
				_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeP, pR[0], pR[1], pR[2], pR[3])
			}
		}
		return nil

	default:
		return fmt.Errorf("not support %s type defaultRole currently", resourceType)
	}
}

/*
EnsureUsersHaveResourceDefaultRole
Params:
	reqFuzzyDefaultRole: see the comments of the struct definition
	uids: the id list of users which will be assign the defaultRole
*/
func (*pms) EnsureUsersHaveResourceDefaultRole(reqFuzzyDefaultRole view.ReqEnsureFuzzyDefaultRole, uids ...int) (err error) {
	if len(uids) <= 0 {
		return nil
	}
	// search fuzzyDefaultRole(s)
	fuzzyDefaultRoles, err := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": reqFuzzyDefaultRole.BelongType,
		"role_name": db.Cond{
			Op:  "like",
			Val: reqFuzzyDefaultRole.RoleNameLike,
		},
	})
	if err != nil || len(fuzzyDefaultRoles) <= 0 {
		return fmt.Errorf("not found any %s type and name like %s defaultRoles",
			reqFuzzyDefaultRole.BelongType, reqFuzzyDefaultRole.RoleNameLike)
	}

	switch reqFuzzyDefaultRole.BelongType {
	case pmsplugin.PrefixInstance:
		// 1. ensure input param referIdx is a valid appId
		insId, err := strconv.Atoi(reqFuzzyDefaultRole.ReferIdx)
		if err != nil {
			return fmt.Errorf("referIdx is an invalid appId, error: %s", err.Error())
		}
		// 2. check the existence of target app based on referIdx(i.e. appId)
		targetInstanceList, err := db.InstanceList(egorm.Conds{
			"id": insId,
		})
		if err != nil || len(targetInstanceList) <= 0 {
			return fmt.Errorf("not found target app based on ReferIdx(appId) %s", reqFuzzyDefaultRole.ReferIdx)
		}

		// 3. assign role to uids
		// 3.1 detect using g or g3 rule based on reqFuzzyDefaultRole's domainType and domainId
		var roleRuleType = pmsplugin.RuleTypeG3
		var domStr string
		if reqFuzzyDefaultRole.DomainType != "" {
			if _, valid := pmsplugin.PermittedDomPrefixMap[reqFuzzyDefaultRole.DomainType]; !valid {
				return fmt.Errorf("the DomainType of reqFuzzyDefaultRole is invalid")
			}
			if reqFuzzyDefaultRole.DomainId == 0 {
				return fmt.Errorf("reqFuzzyDefaultRole's DomainType is not empty, but DomainId is empty")
			}
			roleRuleType = pmsplugin.RuleTypeG
			domStr, _ = pmsplugin.Assemble2CasbinStr(reqFuzzyDefaultRole.DomainType, strconv.Itoa(reqFuzzyDefaultRole.DomainId))
		}
		roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, fuzzyDefaultRoles[0].RoleName,
			pmsplugin.PrefixInstance, reqFuzzyDefaultRole.ReferIdx)
		// 3.2 do assign role to user
		switch roleRuleType {
		case pmsplugin.RuleTypeG3:
			for _, uid := range uids {
				if uid <= 0 {
					continue
				}
				userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(uid))
				_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeG3, userStr, roleStr)
			}
		case pmsplugin.RuleTypeG:
			for _, uid := range uids {
				if uid <= 0 {
					continue
				}
				userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(uid))
				_, _ = pmsplugin.AddRule(pmsplugin.RuleTypeG, userStr, roleStr, domStr)
			}
		}
		return nil
	default:
		return fmt.Errorf("not support %s type defaultRole currently", reqFuzzyDefaultRole.BelongType)
	}
}

// IsRootUser check target user(with param uid) is root or not.
// if returned error is nil, means target user can perform root user's action;
// if returned error != nil, please stop exec the rest codes from the invoked point of upper func and just throwout the error
// Note, this func check system lock status first, when system is locked will return error, even if target uid is root.
func (p *pms) IsRootUser(uid int) error {
	if uid <= 0 {
		return fmt.Errorf("invalid uid %d", uid)
	}
	if pmsplugin.IsRootWithoutCheckingSysLock(uid) {
		return nil
	}
	return fmt.Errorf(MsgNeedRoot)
}

func (p *pms) IsRootUserAndDomNotLock(uid int, reqDomains ...ReqDomainLockStatus) error {
	if err := p.IsRootUser(uid); err != nil {
		return err
	}
	return nil
}

func (*pms) GetRootUsersId() []int {
	rootUids := make([]int, 0)
	eRules := pmsplugin.GetRulesByRoleStrDirectly("role__root", "")
	if eRules != nil && len(*eRules) > 0 {
		for _, eR := range *eRules {
			for _, rule := range eR.Rules {
				uid := pmsplugin.GetUidBySubjectStr(rule[0])
				if uid > 0 {
					rootUids = append(rootUids, uid)
				}
			}
		}

	}
	return rootUids
}

func (p *pms) GrantRootUsers(newRootUids []int) {
	currentRootUids := p.GetRootUsersId()
	isEqual, uidsNeed2Add, uidsNeed2Rm := pmsplugin.CmpUserIds2GetNewAndRmUserIds(currentRootUids, newRootUids)
	if isEqual {
		return
	}
	invoker.Logger.Debug("pms", elog.Any("uidsNeed2Add", uidsNeed2Add), elog.Any("uidsNeed2Add", uidsNeed2Rm))
	for _, newUid := range uidsNeed2Add {
		userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(newUid))
		res, err := pmsplugin.AddRule(pmsplugin.RuleTypeG3, userStr, "role__root")
		if err != nil {
			invoker.Logger.Error("pms", elog.Any("err", err.Error()), elog.Any("res", res))
		}
		invoker.Logger.Debug("pms", elog.Any("res", res))
	}
	for _, rmUid := range uidsNeed2Rm {
		userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(rmUid))
		_, _ = pmsplugin.DelRule(pmsplugin.RuleTypeG3, userStr, "role__root")
	}
}

// GetAllRoles would return all Rules of a user
func (*pms) GetAllRolesOfUser(uid int) (res []view.RoleItem, err error) {
	res = make([]view.RoleItem, 0)
	enhancedRules, err := pmsplugin.GetRulesByUserId(uid, pmsplugin.RuleTypeG, pmsplugin.RuleTypeG3)
	if err != nil {
		return
	}
	for _, eRule := range enhancedRules {
		for _, rule := range eRule.Rules {
			roleItem, err := pmsplugin.TransUserGxRule2RoleItemDetail(eRule.Ptype, rule...)
			if err != nil {
				invoker.Logger.Warn("trans gx rule to roleItem error", zap.Error(err))
				continue
			}
			res = append(res, roleItem)
		}
	}
	return res, nil
}

func (p *pms) GetUsersIdByAppRoleInAllDomain(appId int, roleName string) view.DomainUids {
	result := make(view.DomainUids)
	// check custom role table
	customRolePmsList, _ := db.GetCustomRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"refer_id":    appId,
		"role_name":   roleName,
	})
	if len(customRolePmsList) > 0 {
		validRoleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, customRolePmsList[0].RoleName, pmsplugin.PrefixInstance, strconv.Itoa(appId))
		eRules := pmsplugin.GetRulesByRole(validRoleStr, "")
		if eRules != nil && len(*eRules) > 0 {
			for _, eR := range *eRules {
				if eR.Ptype == pmsplugin.RuleTypeG3 {
					if _, exist := result["*"]; !exist {
						result["*"] = make([]int, 0)
					}
					for _, rule := range eR.Rules {
						uid := pmsplugin.GetUidBySubjectStr(rule[0])
						if uid > 0 {
							result["*"] = append(result["*"], uid)
						}
					}
				} else if eR.Ptype == pmsplugin.RuleTypeG {
					for _, rule := range eR.Rules {
						uid := pmsplugin.GetUidBySubjectStr(rule[0])
						if uid > 0 {
							dom := rule[2]
							if _, exist := result[dom]; !exist {
								result[dom] = make([]int, 0)
							}
							result[dom] = append(result[dom], uid)
						}
					}
				}
			}
		}
		return result
	}
	// default role table
	defaultRolePmsList, _ := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"role_name":   roleName,
	})
	if len(defaultRolePmsList) > 0 {
		roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, defaultRolePmsList[0].RoleName, pmsplugin.PrefixInstance, strconv.Itoa(appId))
		eRules := pmsplugin.GetRulesByRole(roleStr, "")
		if eRules != nil && len(*eRules) > 0 {
			for _, eR := range *eRules {
				if eR.Ptype == pmsplugin.RuleTypeG3 {
					if _, exist := result["*"]; !exist {
						result["*"] = make([]int, 0)
					}
					for _, rule := range eR.Rules {
						uid := pmsplugin.GetUidBySubjectStr(rule[0])
						if uid > 0 {
							result["*"] = append(result["*"], uid)
						}
					}
				} else if eR.Ptype == pmsplugin.RuleTypeG {
					for _, rule := range eR.Rules {
						uid := pmsplugin.GetUidBySubjectStr(rule[0])
						if uid > 0 {
							dom := rule[2]
							if _, exist := result[dom]; !exist {
								result[dom] = make([]int, 0)
							}
							result[dom] = append(result[dom], uid)
						}
					}
				}
			}
		}
		return result
	}
	return result
}

func (p *pms) GetUsersIdByAppRoleInDom(appId int, roleName string, reqDom string) []int {
	uids := make([]int, 0)
	// check custom role table
	customRolePmsList, _ := db.GetCustomRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"refer_id":    appId,
		"role_name":   roleName,
	})
	if len(customRolePmsList) > 0 {
		validRoleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, customRolePmsList[0].RoleName, pmsplugin.PrefixInstance, strconv.Itoa(appId))
		eRules := pmsplugin.GetRulesByRole(validRoleStr, reqDom)
		if eRules != nil {
			for _, eR := range *eRules {
				for _, rule := range eR.Rules {
					uid := pmsplugin.GetUidBySubjectStr(rule[0])
					if uid > 0 {
						uids = append(uids, uid)
					}
				}
			}
		}
		return uids
	}
	// default role table
	defaultRolePmsList, _ := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"role_name":   roleName,
	})
	if len(defaultRolePmsList) > 0 {
		roleStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixRole, defaultRolePmsList[0].RoleName, pmsplugin.PrefixInstance, strconv.Itoa(appId))
		eRules := pmsplugin.GetRulesByRole(roleStr, reqDom)
		if eRules != nil {
			for _, eR := range *eRules {
				for _, rule := range eR.Rules {
					uid := pmsplugin.GetUidBySubjectStr(rule[0])
					if uid > 0 {
						uids = append(uids, uid)
					}
				}
			}
		}
		return uids
	}
	return uids
}

// GetTableAvailableRoles: get defaultRole(s) and customRole(s) of specific app
func (p *pms) GetTableAvailableRoles(appId int) *view.AppAvailableRoles {
	var appDefaultRoles = make([]view.RoleItem, 0)
	var appCustomRoles = make([]view.RoleItem, 0)
	// 1. process app default roles
	defaultRolePmsList, _ := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
	})
	defaultRoleMap := make(map[string][]db.PmsDefaultRole)
	for _, defaultRole := range defaultRolePmsList {
		if _, exist := defaultRoleMap[defaultRole.RoleName]; !exist {
			defaultRoleMap[defaultRole.RoleName] = []db.PmsDefaultRole{*defaultRole}
			continue
		}
		defaultRoleMap[defaultRole.RoleName] = append(defaultRoleMap[defaultRole.RoleName], *defaultRole)
	}
	for roleName, defaultRoles := range defaultRoleMap {
		desc := defaultRoles[0].Description
		details := make([]view.RolePmsDetail, 0)
		for _, defaultRole := range defaultRoles {
			details = append(details, view.RolePmsDetail{
				SubResources: defaultRole.SubResources,
				Acts:         defaultRole.Acts,
			})
		}
		appDefaultRoles = append(appDefaultRoles, view.RoleItem{
			BelongType: pmsplugin.PrefixInstance,
			ReferId:    0,
			ReferGroup: "",
			RoleName:   roleName,
			RoleDesc:   desc,
			PmsDetails: details,
			DomainType: "",
			DomainId:   0,
		})

	}
	// 2. process app custom roles
	customRolePmsList, _ := db.GetCustomRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"refer_id":    appId,
	})
	customRoleMap := make(map[string][]db.PmsCustomRole)
	for _, customRole := range customRolePmsList {
		if _, exist := customRoleMap[customRole.RoleName]; !exist {
			customRoleMap[customRole.RoleName] = []db.PmsCustomRole{*customRole}
			continue
		}
		customRoleMap[customRole.RoleName] = append(customRoleMap[customRole.RoleName], *customRole)
	}
	for roleName, customRoles := range customRoleMap {
		desc := customRoles[0].Description
		details := make([]view.RolePmsDetail, 0)
		for _, customRole := range customRoles {
			details = append(details, view.RolePmsDetail{
				SubResources: customRole.SubResources,
				Acts:         customRole.Acts,
			})
		}
		appCustomRoles = append(appCustomRoles, view.RoleItem{
			BelongType: pmsplugin.PrefixInstance,
			ReferId:    appId,
			ReferGroup: "",
			RoleName:   roleName,
			RoleDesc:   desc,
			PmsDetails: details,
			DomainType: "",
			DomainId:   0,
		})

	}
	return &view.AppAvailableRoles{
		AppId:   appId,
		Default: appDefaultRoles,
		Custom:  appCustomRoles,
	}

}

func (p *pms) GetTableRolesAssignmentInfoInAllDom(appId int) (appRolesAssignRes view.TableRolesAssignmentInfo) {
	// 先查两个表, default_role & custom_role; 然后通过casbin api去获取userId 填充AppRolesAssignmentInfo
	customRolePmsList, _ := db.GetCustomRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"refer_id":    appId,
	})
	defaultRolePmsList, _ := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
	})
	appRolesAssignRes.AppId = appId
	// first traverse app customRole item
	customRoleMap := make(map[string][]db.PmsCustomRole)
	for _, customRole := range customRolePmsList {
		if _, exist := customRoleMap[customRole.RoleName]; !exist {
			customRoleMap[customRole.RoleName] = []db.PmsCustomRole{*customRole}
			continue
		}
		customRoleMap[customRole.RoleName] = append(customRoleMap[customRole.RoleName], *customRole)
	}
	for roleName, customRoles := range customRoleMap {
		desc := customRoles[0].Description
		details := make([]view.RolePmsDetail, 0)
		for _, customRolePms := range customRoles {
			details = append(details, view.RolePmsDetail{
				SubResources: customRolePms.SubResources,
				Acts:         customRolePms.Acts,
			})
		}
		domUids := p.GetUsersIdByAppRoleInAllDomain(appId, roleName)
		if len(domUids) <= 0 {
			continue
		}
		for dom, uids := range domUids {
			domType, domId := pmsplugin.GetDomTypeAndId(dom)
			appRolesAssignRes.RolesInfo = append(appRolesAssignRes.RolesInfo, view.AppRoleInfoItem{
				RoleItem: view.RoleItem{
					BelongType: pmsplugin.PrefixInstance,
					ReferId:    appId,
					ReferGroup: "",
					RoleName:   roleName,
					RoleDesc:   desc,
					PmsDetails: details,
					DomainType: domType,
					DomainId:   domId,
				},
				Uids: uids,
			})
		}

	}
	// then traverse global defaultRole item of app
	defaultRoleMap := make(map[string][]db.PmsDefaultRole)
	for _, defaultRole := range defaultRolePmsList {
		if _, exist := defaultRoleMap[defaultRole.RoleName]; !exist {
			defaultRoleMap[defaultRole.RoleName] = []db.PmsDefaultRole{*defaultRole}
			continue
		}
		defaultRoleMap[defaultRole.RoleName] = append(defaultRoleMap[defaultRole.RoleName], *defaultRole)
	}
	for roleName, defaultRoles := range defaultRoleMap {
		roleDesc := defaultRoles[0].Description
		details := make([]view.RolePmsDetail, 0)
		for _, defaultRolePms := range defaultRoles {
			details = append(details, view.RolePmsDetail{
				SubResources: defaultRolePms.SubResources,
				Acts:         defaultRolePms.Acts,
			})
		}
		domUids := p.GetUsersIdByAppRoleInAllDomain(appId, roleName)
		if len(domUids) <= 0 {
			continue
		}
		for dom, uids := range domUids {
			domType, domId := pmsplugin.GetDomTypeAndId(dom)
			appRolesAssignRes.RolesInfo = append(appRolesAssignRes.RolesInfo, view.AppRoleInfoItem{
				RoleItem: view.RoleItem{
					BelongType: pmsplugin.PrefixInstance,
					ReferId:    0, // the referId of default role is 0
					ReferGroup: "",
					RoleName:   roleName,
					RoleDesc:   roleDesc,
					PmsDetails: details,
					DomainType: domType,
					DomainId:   domId,
				},
				Uids: uids,
			})
		}
	}
	return
}

func (p *pms) GetAppRolesAssignmentInfoInDom(appId int, reqDom string) (appRolesAssignRes view.TableRolesAssignmentInfo) {
	reqDomType, reqDomId := pmsplugin.GetDomTypeAndId(reqDom)
	// 先查两个表, default_role & custom_role; 然后通过casbin api去获取userId 填充AppRolesAssignmentInfo
	customRolePmsList, _ := db.GetCustomRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
		"refer_id":    appId,
	})
	defaultRolePmsList, _ := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": pmsplugin.PrefixInstance,
	})
	appRolesAssignRes.AppId = appId
	// first traverse app customRole item
	customRoleMap := make(map[string][]db.PmsCustomRole)
	for _, customRole := range customRolePmsList {
		if _, exist := customRoleMap[customRole.RoleName]; !exist {
			customRoleMap[customRole.RoleName] = []db.PmsCustomRole{*customRole}
			continue
		}
		customRoleMap[customRole.RoleName] = append(customRoleMap[customRole.RoleName], *customRole)
	}
	for roleName, customRoles := range customRoleMap {
		desc := customRoles[0].Description
		details := make([]view.RolePmsDetail, 0)
		for _, customRolePms := range customRoles {
			details = append(details, view.RolePmsDetail{
				SubResources: customRolePms.SubResources,
				Acts:         customRolePms.Acts,
			})
		}
		uids := p.GetUsersIdByAppRoleInDom(appId, roleName, reqDom)

		appRolesAssignRes.RolesInfo = append(appRolesAssignRes.RolesInfo, view.AppRoleInfoItem{
			RoleItem: view.RoleItem{
				BelongType: pmsplugin.PrefixInstance,
				ReferId:    appId,
				ReferGroup: "",
				RoleName:   roleName,
				RoleDesc:   desc,
				PmsDetails: details,
				DomainType: reqDomType,
				DomainId:   reqDomId,
			},
			Uids: uids,
		})
	}
	// then traverse global defaultRole item of app
	defaultRoleMap := make(map[string][]db.PmsDefaultRole)
	for _, defaultRole := range defaultRolePmsList {
		if _, exist := defaultRoleMap[defaultRole.RoleName]; !exist {
			defaultRoleMap[defaultRole.RoleName] = []db.PmsDefaultRole{*defaultRole}
			continue
		}
		defaultRoleMap[defaultRole.RoleName] = append(defaultRoleMap[defaultRole.RoleName], *defaultRole)
	}
	for roleName, defaultRoles := range defaultRoleMap {
		roleDesc := defaultRoles[0].Description
		details := make([]view.RolePmsDetail, 0)
		for _, defaultRolePms := range defaultRoles {
			details = append(details, view.RolePmsDetail{
				SubResources: defaultRolePms.SubResources,
				Acts:         defaultRolePms.Acts,
			})
		}
		uids := p.GetUsersIdByAppRoleInDom(appId, roleName, reqDom)
		appRolesAssignRes.RolesInfo = append(appRolesAssignRes.RolesInfo, view.AppRoleInfoItem{
			RoleItem: view.RoleItem{
				BelongType: pmsplugin.PrefixInstance,
				ReferId:    0, // the referId of default role is 0
				ReferGroup: "",
				RoleName:   roleName,
				RoleDesc:   roleDesc,
				PmsDetails: details,
				DomainType: reqDomType,
				DomainId:   reqDomId,
			},
			Uids: uids,
		})

	}
	return
}

// GetAllDefaultRoles:  get all current default roles
func (*pms) GetPmsDefaultRoles(conds db.Conds) ([]*db.PmsDefaultRole, error) {
	return db.GetDefaultRolePmsList(conds)
}

// OverwriteAppRolesUser: overwrite the granted state of all roles of an app, based on the input param []AppRoleUsersItem
func (p *pms) OverwriteAppRolesUser(appId int, appNewRolesWithUsers []view.AppRoleInfoItem) {
	wait2Add := make([]view.AppRoleInfoItem, 0)
	wait2Del := make([]view.AppRoleInfoItem, 0)
	// appCurrentRolesAssignInfo := p.GetAppRolesAssignmentInfo(appId, "")
	appCurrentRolesAssignInfo := p.GetTableRolesAssignmentInfoInAllDom(appId)
	for k1, appNewRole := range appNewRolesWithUsers {
		if appNewRole.BelongType != pmsplugin.PrefixInstance || appNewRole.ReferId != appId {
			continue
		}
		for k2, appCurrentRole := range appCurrentRolesAssignInfo.RolesInfo {
			if appNewRole.RoleName == appCurrentRole.RoleName && appNewRole.DomainType == appCurrentRole.DomainType &&
				appNewRole.DomainId == appCurrentRole.DomainId {
				appNewRolesWithUsers[k1].RoleName = "-skip"
				appCurrentRolesAssignInfo.RolesInfo[k2].RoleName = "-skip"
				isEqual, needAdd, needRm := pmsplugin.CmpUserIds2GetNewAndRmUserIds(appCurrentRole.Uids, appNewRole.Uids)
				if isEqual {
					continue
				}
				if len(needAdd) > 0 {
					wait2Add = append(wait2Add, view.AppRoleInfoItem{
						RoleItem: appNewRole.RoleItem,
						Uids:     needAdd,
					})
				}
				if len(needRm) > 0 {
					wait2Del = append(wait2Del, view.AppRoleInfoItem{
						RoleItem: view.RoleItem{
							BelongType: pmsplugin.PrefixInstance,
							ReferId:    appId,
							ReferGroup: "",
							RoleName:   appCurrentRole.RoleName,
							DomainType: appCurrentRole.DomainType,
							DomainId:   appCurrentRole.DomainId,
						},
						Uids: needRm,
					})
				}
			}
		}
	}

	for _, newRole := range appNewRolesWithUsers {
		if newRole.RoleName == "-skip" || len(newRole.Uids) == 0 {
			continue
		}
		wait2Add = append(wait2Add, view.AppRoleInfoItem{
			RoleItem: newRole.RoleItem,
			Uids:     newRole.Uids,
		})
	}
	for _, rmRole := range appCurrentRolesAssignInfo.RolesInfo {
		if rmRole.RoleName == "-skip" || len(rmRole.Uids) == 0 {
			continue
		}
		wait2Del = append(wait2Del, view.AppRoleInfoItem{
			RoleItem: view.RoleItem{
				BelongType: pmsplugin.PrefixInstance,
				ReferId:    appId,
				ReferGroup: "",
				RoleName:   rmRole.RoleName,
				DomainType: rmRole.DomainType,
				DomainId:   rmRole.DomainId,
			},
			Uids: rmRole.Uids,
		})
	}

	if len(wait2Add) > 0 {
		p.AddUsers2AppRoles(&wait2Add)
	}
	if len(wait2Del) > 0 {
		p.DelUsersFromAppRoles(&wait2Del)
	}
}

// RemoveUserRoles - remove roles of specific user
func (p *pms) RemoveUserRoles(userId string, reqRoles []view.RoleItem) (err error) {
	if userId == "" {
		return errors.New("userId cannot be empty")
	}
	userStr, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, userId)
	for _, roleItem := range reqRoles {
		roleStr, err := pmsplugin.GetValidRoleStrByRoleItem(roleItem)
		if err != nil {
			continue
		}
		var gType = pmsplugin.RuleTypeG3
		var targetDom string
		if roleItem.DomainType != "" {
			targetDom, err = pmsplugin.Assemble2CasbinStr(roleItem.DomainType, strconv.Itoa(roleItem.DomainId))
			if err != nil {
				invoker.Logger.Warn("invalid dom format", zap.Error(err))
				continue
			}
			gType = pmsplugin.RuleTypeG
		}
		if _, err := pmsplugin.DelRule(gType, userStr, roleStr, targetDom); err != nil {
			invoker.Logger.Warn("remove user role error", zap.String("role", roleStr), zap.Error(err))
		}
	}
	return nil
}
