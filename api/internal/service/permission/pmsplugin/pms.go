package pmsplugin

import (
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/casbin/casbin/v2"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

var (
	enforcer     *casbin.Enforcer
	enforcerLock = &sync.Mutex{}
)

// Invoker SetUp permission handler
func Invoker() {
	rulePath := econf.GetString("casbin.rule.path")
	a, err := gormadapter.NewAdapterByDBUseTableName(invoker.Db, "", db.TableNamePmsCasbinRule)
	if err != nil {
		elog.Panic("Casbin gorm-adapter panic", zap.Error(err))
	}
	enforcer, err = casbin.NewEnforcer(rulePath, a)
	if err != nil {
		elog.Panic("Casbin NewEnforcer panic", zap.Error(err))
	}
}

/*
	GetRulesByUserId: get rules(p, g, or g3) by specific userId.  note, g2 is for resource roles, not for users
	parameters:
		userID: the id of user; type is string
		ruleTypes: optional; the valid value is ["p", "g", "g3"]; if not specify any gTypes, will return all ruleTypes("p", "g", and "g3") rules of user
	return:
		result: a list of EnhancedCasbinRulesItem
		err: an error will return, if all specified ruleTypes(s) are invalid.
TODO: after fetched the rules(p, g, g3), how to distinguish the meaning of sub, obj string of rule.
*/
func GetRulesByUserId(userId int, ruleTypes ...string) (result []EnhancedCasbinRulesItem, err error) {
	uidStr := strconv.Itoa(userId)
	// note that, before searching, we need to add prefix before userId like "user__uid"
	subjectFieldStr, err := Assemble2CasbinStr(PrefixUser, uidStr) // if the userId is "101" then the subjectFieldStr is "user__101"
	if err != nil {                                                // if userId is empty, then will return err
		return
	}
	var targetRuleTypes []string
	if len(ruleTypes) > 0 {
		for _, rType := range ruleTypes {
			if _, valid := PermittedUserRuleMap[rType]; valid {
				targetRuleTypes = append(targetRuleTypes, rType)
			}
		}
		if len(targetRuleTypes) == 0 {
			return result, errors.New(fmt.Sprintf("all of %v are invalid userRule type(p, g, g3).", ruleTypes))
		}
	} else { // not specify any gTypes, so using all permitted userRuleTypes.
		for rType, _ := range PermittedRuleTypes {
			targetRuleTypes = append(targetRuleTypes, rType)
		}
	}
	result = make([]EnhancedCasbinRulesItem, 0)
	// now searching...
	for _, rType := range targetRuleTypes {
		var rules [][]string
		if rType == RuleTypeP {
			rules = enforcer.GetFilteredPolicy(0, subjectFieldStr)
		} else {
			rules = enforcer.GetFilteredNamedGroupingPolicy(rType, 0, subjectFieldStr)
		}
		if len(rules) > 0 {
			result = append(result, EnhancedCasbinRulesItem{Ptype: rType, Rules: rules})
		}
	}
	return result, nil
}

/*
	TransUserGxRule2RoleItemDetail: trans user's g or g3 rule(which the first item like 'user__x') to RoleItem struct
*/
func TransUserGxRule2RoleItemDetail(gType string, ruleParams ...string) (res view.RoleItem, err error) {
	if gType != RuleTypeG && gType != RuleTypeG3 {
		return res, errors.New("only support g or g3 ruleType")
	}
	if gType == RuleTypeG {
		if len(ruleParams) < 3 {
			return res, errors.New("g rule must has 3 items")
		}
		// g rule has dom
		splitDom, err := SplitCasbinUnActStr(ruleParams[2])
		if err != nil {
			return res, errors.Wrap(err, "invalid dom in g")
		}
		domId, err := strconv.Atoi(splitDom[1])
		if err != nil {
			return res, errors.Wrap(err, "invalid dom in g")
		}
		res.DomainType = splitDom[0]
		res.DomainId = domId
	}
	if len(ruleParams) < 2 {
		return res, errors.New("the items of gx rule must great than or equal to 2")
	}
	if !strings.Contains(ruleParams[0], PrefixUser) {
		return res, errors.New("current g or g3 rule not contain userInfo")
	}
	splitRole, err := SplitCasbinUnActStr(ruleParams[1])
	if err != nil {
		return res, errors.Wrap(err, "invalid role string in g or g3")
	}
	if len(splitRole) != 4 {
		return res, errors.Wrap(err, "invalid role string in g or g3")
	}
	referId, err := strconv.Atoi(splitRole[3])
	if err != nil {
		// TODO: not return error, after support g2 resource role.
		return res, errors.Wrap(err, "invalid referId in role string of g or g3")
	}
	res.RoleName = splitRole[1]
	res.BelongType = splitRole[2]
	res.ReferId = referId
	return res, nil
}

/*
	GetRulesByResourceObj: Search CasbinRules to get all rules(explicit and implicit) which related to "obj" string
	Parameter:
		targetObj: the target resource obj string which in policy_definition; like: app__{{AID}}__baseInfo, app__{{AID}}__* and etc.
		reqAct: (Optional) the act of targetResource for filter out the rules. If empty string will not check act
		reqDom: (Optional) the domain of targetResource for filter out the rules. If empty string will not check dom
	Return:
		a pointer which point to the casbin rule list which related to targetObj
*/
func GetRulesByResourceObj(targetObj string, reqAct string, reqDom string) *[]EnhancedCasbinRulesItem {
	if targetObj == "" {
		return nil
	}
	if targetObj != "" {
		if _, valid := PermittedPrefixMap[GetPrefixOfString(targetObj)]; !valid {
			return nil
		}
	}
	var needCheckAct = true
	var needCheckDom = true
	if reqAct == "" {
		needCheckAct = false
	}
	if reqDom == "" {
		needCheckDom = false
	}
	finalResultList := make([]EnhancedCasbinRulesItem, 0)
	/*
		init EnhancedCasbinRulesItem list before recursion
		only need to search in p and g2, because only p and g2 may contain resource obj
	*/
	pRules := enforcer.GetFilteredPolicy(1, targetObj) // index:1 i.e. the second item of a p rule may contain resourceObj
	if len(pRules) > 0 {
		eItem := EnhancedCasbinRulesItem{
			Ptype: RuleTypeP,
			Rules: [][]string{},
		}
		// p rules contains dom and act, so check domain and action based on 2 vars, i.e. needCheckAct and needCheckDom
		for _, p_r := range pRules {
			if needCheckAct && !IsActMatched(reqAct, p_r[2]) {
				continue
			}
			if needCheckDom && !IsDomMatched(reqDom, p_r[3]) {
				continue
			}
			eItem.Rules = append(eItem.Rules, p_r)
		}
		if len(eItem.Rules) > 0 {
			finalResultList = append(finalResultList, eItem)
		}
	}
	g2Rules := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG2, 0, targetObj) // index:0 i.e. the first item of a g2 rule may contain resourceObj
	if len(g2Rules) > 0 {
		// g2 rules do not need to check domain
		eItem := EnhancedCasbinRulesItem{
			Ptype: RuleTypeG2,
			Rules: g2Rules,
		}
		finalResultList = append(finalResultList, eItem)
	}

	// then further searching... invoke the recursive search function.
	reverseSearchFurtherRules(&finalResultList, reqAct, reqDom, finalResultList...)
	return &finalResultList
}

/*
	reverseSearchFurtherRules: a private recursive function for pegging rules based on the feature of 'g' operator of casbin and matchers of model file
	parameters:
		finalResults: a pointer which point to the final results list;
		reqAct: used to filter rules throughout pegging. if it's empty string, then will not check act in rules
		reqDom: used to filter rules(p, g) throughout pegging. if it's empty string, then will not check dom in rules
		furtherSearchItems: intermediate items used for next recursion, if its length == 0, will break the recursion
	Note:
		1. the init stage is done by invoker. i.e. the invoker need to do the preliminary screening.
		2. all matched rules are stored in the slice which the "finalResults" pointed.
		3. the *finalResults may have duplicate items.
		4. the *finalResults may contain many ruleTypes(p, g, g2, g3), filter out the target rule in upper func.

	Caution: if the content of casbinModelFile is changed, this function may also need to be modified accordingly.
*/
func reverseSearchFurtherRules(finalResults *[]EnhancedCasbinRulesItem, reqAct string, reqDom string, furtherSearchItems ...EnhancedCasbinRulesItem) {
	if len(furtherSearchItems) < 1 || finalResults == nil {
		return
	}
	var needCheckAct = true
	var needCheckDom = true
	if reqAct == "" {
		needCheckAct = false
	}
	if reqDom == "" {
		needCheckDom = false
	}

	var itemsNeedFurtherSearch []EnhancedCasbinRulesItem
	for _, item := range furtherSearchItems {
		switch item.Ptype {
		case RuleTypeP:
			for _, searchedPRule := range item.Rules {
				/*
					for a checked p rule, during pegging process, need to use the first item(sub) of p to search against g and g3
					do not need to further search "p" policies, because "p" type policy is non-transitive
					do not need to further search "g2" rules neither, because the first item(i.e. sub) of "p" can not exist in g2,
					and the second item(i.e. obj) of "p" is checked in previous recursion
				*/
				// use the first item(i.e. sub) of p rule(which already searched by previous recursion) to further search g and g3 rules
				gRules := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG, 1, searchedPRule[0])
				if len(gRules) > 0 {
					eItem := EnhancedCasbinRulesItem{
						Ptype: RuleTypeG,
						Rules: [][]string{},
					}
					// g rules contain domain, so check dom based on "needCheckDom" var
					if needCheckDom {
						for _, gRule := range gRules {
							if IsDomMatched(reqDom, gRule[2]) {
								eItem.Rules = append(eItem.Rules, gRule)
							}
						}
					} else {
						eItem.Rules = gRules
					}
					if len(eItem.Rules) > 0 {
						*finalResults = append(*finalResults, eItem)
						itemsNeedFurtherSearch = append(itemsNeedFurtherSearch, eItem)
					}
				}
				g3Rules := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG3, 1, searchedPRule[0])
				if len(g3Rules) > 0 {
					// g3 rules do not need to check domain
					eItem := EnhancedCasbinRulesItem{
						Ptype: RuleTypeG3,
						Rules: g3Rules,
					}
					*finalResults = append(*finalResults, eItem)
					itemsNeedFurtherSearch = append(itemsNeedFurtherSearch, eItem)
				}
			}
		case RuleTypeG:
			/*
				note that: 	1. "g" rule is under dom. i.e. need to check domain
							2. in pegging process, "g" rule cannot transit to g2,g3 and p.
							   i.e. for every searched g rule(got from previous recursion), just use its first item(i.e. sub)
							   for further checking against "g" rules
			*/
			for _, searchedGRule := range item.Rules {
				gRules := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG, 1, searchedGRule[0])
				if len(gRules) > 0 {
					eItem := EnhancedCasbinRulesItem{
						Ptype: RuleTypeG,
						Rules: [][]string{},
					}
					// g rules contain dom, so check it based on var "needCheckDom"
					if needCheckDom {
						// check dom for each g rule
						for _, gRule := range gRules {
							if IsDomMatched(reqDom, gRule[2]) {
								eItem.Rules = append(eItem.Rules, gRule)
							}
						}
					} else {
						// do not check dom, just assign g rules to eItem
						eItem.Rules = gRules
					}
					if len(eItem.Rules) > 0 {
						*finalResults = append(*finalResults, eItem)
						itemsNeedFurtherSearch = append(itemsNeedFurtherSearch, eItem)
					}
				}
			}
		case RuleTypeG2:
			/*
					note, 1. g2 is resourceRole, so the search direction differ from g and g3;
						  2. g2 may transit to p or other g2 rules. i.e. need to further check p and g2 based on current "g2" rules.
				          3. g2 without dom, i.e. do not need to check domain in g2 rules
			*/
			for _, searchedG2Rules := range item.Rules {
				// note that, here is different from the further search of g and g3
				g2Rules := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG2, 0, searchedG2Rules[1])
				if len(g2Rules) > 0 {
					// g2 rules do not need to check domain
					eItem := EnhancedCasbinRulesItem{
						Ptype: RuleTypeG2,
						Rules: g2Rules,
					}
					*finalResults = append(*finalResults, eItem)
					itemsNeedFurtherSearch = append(itemsNeedFurtherSearch, eItem)
				}
				pRules := enforcer.GetFilteredPolicy(1, searchedG2Rules[1])
				// p rules contain dom and act, so check domain and action base on two vars, i.e. needCheckDom and needCheckAct
				if len(pRules) > 0 {
					eItem := EnhancedCasbinRulesItem{
						Ptype: RuleTypeP,
						Rules: [][]string{},
					}
					for _, p_r := range pRules {
						if needCheckAct && !IsActMatched(reqAct, p_r[2]) {
							continue
						}
						if needCheckDom && !IsDomMatched(reqDom, p_r[3]) {
							continue
						}
						eItem.Rules = append(eItem.Rules, p_r)
					}
					if len(eItem.Rules) > 0 {
						*finalResults = append(*finalResults, eItem)
						itemsNeedFurtherSearch = append(itemsNeedFurtherSearch, eItem)
					}
				}
			}
		case RuleTypeG3:
			// same as g, but do not need to check domain
			for _, searchedG3Rule := range item.Rules {
				g3Rules := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG3, 1, searchedG3Rule[0])
				if len(g3Rules) > 0 {
					eItem := EnhancedCasbinRulesItem{
						Ptype: RuleTypeG3,
						Rules: g3Rules,
					}
					*finalResults = append(*finalResults, eItem)
					itemsNeedFurtherSearch = append(itemsNeedFurtherSearch, eItem)
				}
			}
		}
	}
	reverseSearchFurtherRules(finalResults, reqAct, reqDom, itemsNeedFurtherSearch...)
}

// AddRule : add one policy by enforcer
// first : the ruleType; value in ["p", "g", "g2", "g3"]
// second: the params of the rule; if ruleType is "p", then the params is "subStr", "objStr", "actStr", "domStr"
func AddRule(ruleType string, params ...interface{}) (bool, error) {
	enforcerLock.Lock()
	defer enforcerLock.Unlock()
	switch ruleType {
	case RuleTypeP:
		if len(params) < 4 {
			return false, errors.New("add rule failed, p rule must have 4 items")
		}
		return enforcer.AddPolicy(params[:4]...)
	case RuleTypeG:
		if len(params) < 3 {
			return false, errors.New("add rule failed, g rule must have 3 items")
		}
		return enforcer.AddNamedGroupingPolicy(ruleType, params[:3]...)
	case RuleTypeG2:
		if len(params) < 2 {
			return false, errors.New("add rule failed, g2 rule must have 2 items")
		}
		return enforcer.AddNamedGroupingPolicy(ruleType, params[:2]...)
	case RuleTypeG3:
		if len(params) < 2 {
			return false, errors.New("add rule failed, g3 rule must have 2 items")
		}
		invoker.Logger.Debug("pms", elog.Any("ruleType", ruleType), elog.Any("params[:2]", params[:2]))

		return enforcer.AddNamedGroupingPolicy(ruleType, params[:2]...)
	default:
		return false, errors.New("add rule failed, invalid rule type")
	}
}

// DelRule : delete one policy by enforcer
func DelRule(ruleType string, params ...interface{}) (bool, error) {
	enforcerLock.Lock()
	defer enforcerLock.Unlock()
	switch ruleType {
	case RuleTypeP:
		if len(params) < 4 {
			return false, errors.New("delete rule failed, p rule must have 4 items")
		}
		return enforcer.RemovePolicy(params[:4]...)
	case RuleTypeG:
		if len(params) < 3 {
			return false, errors.New("delete rule failed, g rule must have 3 items")
		}
		return enforcer.RemoveNamedGroupingPolicy(ruleType, params[:3]...)
	case RuleTypeG2:
		if len(params) < 2 {
			return false, errors.New("delete rule failed, g2 rule must have 2 items")
		}
		return enforcer.RemoveNamedGroupingPolicy(ruleType, params[:2]...)
	case RuleTypeG3:
		if len(params) < 2 {
			return false, errors.New("delete rule failed, g3 rule must have 2 items")
		}
		return enforcer.RemoveNamedGroupingPolicy(ruleType, params[:2]...)
	default:
		return false, errors.New("delete rule failed, invalid rule type")
	}

}

func EnforcerLock() {
	enforcerLock.Lock()
}
func EnforcerUnlock() {
	enforcerLock.Unlock()
}

// func EnforcerLoadPolicy() {
// 	_ = enforcer.LoadPolicy()
// 	if watcher != nil {
// 		err := (*watcher).Update()
// 		if err != nil {
// 			invoker.Logger.Debugf("casbin watcher.Update failed. %v", err)
// 		}
// 	}
// }

func ReloadPolicy() {
	invoker.Logger.Info("Casbin policies reloaded.")
	enforcerLock.Lock()
	_ = enforcer.LoadPolicy()
	enforcerLock.Unlock()
}

// remember reload casbin policy after invoked this function
func AddCasbinRules2Db(tx *gorm.DB, addEhRules []EnhancedCasbinRulesItem) (err error) {
	if len(addEhRules) == 0 {
		return nil
	}
	for _, ehRule := range addEhRules {
		for _, rule := range ehRule.Rules {
			if err := addCasbinRuleDbRecord(tx, ehRule.Ptype, rule); err != nil {
				return err
			}
		}
	}
	return nil
}

// remember reload casbin policy after invoked this function
func DelCasbinRulesFromDb(tx *gorm.DB, delEhRules []EnhancedCasbinRulesItem) (err error) {
	if len(delEhRules) == 0 {
		return nil
	}
	for _, ehRule := range delEhRules {
		for _, rule := range ehRule.Rules {
			if err := delCasbinRuleDbRecord(tx, ehRule.Ptype, rule); err != nil {
				return err
			}
		}
	}
	return nil
}

func addCasbinRuleDbRecord(tx *gorm.DB, ptype string, vxs []string) (err error) {
	var newDbItem = db.PmsCasbinRule{
		Ptype: ptype,
	}
	conds := make(egorm.Conds)
	conds["ptype"] = ptype
	switch ptype {
	case RuleTypeP:
		if len(vxs) < 4 {
			return fmt.Errorf("p rule must has 4 items. ")
		}
		conds["v2"] = vxs[2]
		conds["v3"] = vxs[3]
		newDbItem.V2 = vxs[2]
		newDbItem.V3 = vxs[3]
	case RuleTypeG:
		if len(vxs) < 3 {
			return fmt.Errorf("g rule must has 3 items. ")
		}
		conds["v2"] = vxs[2]
		newDbItem.V2 = vxs[2]
	case RuleTypeG2, RuleTypeG3:
		if len(vxs) < 2 {
			return fmt.Errorf("g2 or g3 rule must has 2 items. ")
		}
	default:
		return fmt.Errorf("invalid pType(%s), stop deleting dbCasbinRule. ", ptype)
	}
	conds["v0"] = vxs[0]
	conds["v1"] = vxs[1]
	newDbItem.V0 = vxs[0]
	newDbItem.V1 = vxs[1]
	sql, binds := egorm.BuildQuery(conds)
	var existRecord db.PmsCasbinRule
	err = tx.Table(db.TableNamePmsCasbinRule).Where(sql, binds...).First(&existRecord).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		invoker.Logger.Error("check existence of casbinRule error.", zap.Error(err))
		return fmt.Errorf("check existence of casbinRule failed. ")
	}
	if existRecord.Id != 0 {
		// target rule already exist in db, do not do creation
		return nil
	}
	return tx.Create(&newDbItem).Error
}

func delCasbinRuleDbRecord(tx *gorm.DB, ptype string, vxs []string) (err error) {
	conds := make(egorm.Conds)
	conds["ptype"] = ptype
	switch ptype {
	case RuleTypeP:
		if len(vxs) < 4 {
			return fmt.Errorf("p rule must has 4 items. ")
		}
		conds["v2"] = vxs[2]
		conds["v3"] = vxs[3]
	case RuleTypeG:
		if len(vxs) < 3 {
			return fmt.Errorf("g rule must has 3 items. ")
		}
		conds["v2"] = vxs[2]
	case RuleTypeG2, RuleTypeG3:
		if len(vxs) < 2 {
			return fmt.Errorf("g2 or g3 rule must has 2 items. ")
		}
	default:
		return fmt.Errorf("invalid pType(%s), stop deleting dbCasbinRule. ", ptype)
	}
	conds["v0"] = vxs[0]
	conds["v1"] = vxs[1]
	sql, binds := egorm.BuildQuery(conds)
	var existRecord db.PmsCasbinRule
	err = tx.Table(db.TableNamePmsCasbinRule).Where(sql, binds...).First(&existRecord).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		invoker.Logger.Error("check existence of casbinRule error.", zap.Error(err))
		return fmt.Errorf("check existence of casbinRule failed. ")

	}
	// if target casbin rule not exist in db, do not perform deleting process
	if existRecord.Id == 0 {
		return nil
	}
	return tx.Table(db.TableNamePmsCasbinRule).Where("id = ?", existRecord.Id).Delete(&db.PmsCasbinRule{}).Error
}

/*
	GetRulesByRoleStrDirectly: get rules by roleStr directly
note that, the searching is directly, do not use recursion
only g and g2 ruleType is permitted
param:
	roleStr: like "role__xxx"
	reqDom: (Optional) the domainStr for filter out the rules. If empty string will not check dom
*/
func GetRulesByRoleStrDirectly(roleStr string, reqDom string) *[]EnhancedCasbinRulesItem {
	if !strings.Contains(roleStr, PrefixRole+SEP) {
		return nil
	}
	var targetRuleTypes = []string{RuleTypeG, RuleTypeG3}
	var needCheckDom = true
	if reqDom == "" {
		needCheckDom = false
	}
	result := make([]EnhancedCasbinRulesItem, 0)
	// now searching...
	for _, rType := range targetRuleTypes {
		var rules [][]string
		rules = enforcer.GetFilteredNamedGroupingPolicy(rType, 1, roleStr)
		if len(rules) <= 0 {
			continue
		}
		if rType == RuleTypeG {
			enhanceRuleItem := EnhancedCasbinRulesItem{
				Ptype: rType,
				Rules: [][]string{},
			}
			// g rules contain dom, so check domain depends on the var "needCheckDom"
			if needCheckDom {
				for _, gRule := range rules {
					if IsDomMatched(reqDom, gRule[2]) {
						enhanceRuleItem.Rules = append(enhanceRuleItem.Rules, gRule)
					}
				}
			} else {
				enhanceRuleItem.Rules = rules
			}
			if len(enhanceRuleItem.Rules) > 0 {
				result = append(result, enhanceRuleItem)
			}
		} else {
			result = append(result, EnhancedCasbinRulesItem{Ptype: rType, Rules: rules})
		}
	}
	return &result
}

// GetRulesByRole : Search CasbinRules to get all rules(explicit and implicit) which related to "role" string
// Note, if reqDom == "" then will not check dom in g rules
func GetRulesByRole(roleStr string, reqDom string) *[]EnhancedCasbinRulesItem {
	if !strings.Contains(roleStr, PrefixRole+SEP) {
		return nil
	}
	finalResultList := make([]EnhancedCasbinRulesItem, 0)
	/*
		init EnhancedCasbinRulesItem list before recursion
		for second item of a rule only g and g3 may contain "role__"; the first item of a p rule, may also has the roleStr
		Note, in this init, we only need to find out the p rules, the other g and g3 rules will be found in recursion.
	*/
	pRules := enforcer.GetFilteredPolicy(0, roleStr) // index:0  i.e. the first item of a p rule may contain roleStr
	if len(pRules) > 0 {
		eItem := EnhancedCasbinRulesItem{
			Ptype: RuleTypeP,
			Rules: pRules,
		}
		if len(eItem.Rules) > 0 {
			finalResultList = append(finalResultList, eItem)
		}

	}

	// then further searching... invoke the recursive search function.
	reverseSearchFurtherRules(&finalResultList, "", reqDom, finalResultList...)
	return &finalResultList
}

func GetUidBySubjectStr(subjectStr string) (uid int) {
	if !strings.Contains(subjectStr, PrefixUser+SEP) {
		return 0
	}
	splitStr := strings.Split(subjectStr, SEP)
	if len(splitStr) != 2 {
		return 0
	}
	uid, _ = strconv.Atoi(splitStr[1])
	return
}

// GetPmsCommonInfo:  trans permitted_maps to viewStruct
func GetPmsCommonInfo(iid int) view.ResPmsCommonInfo {
	var rulesInfo, prefixesInfo, allActsInfo, normalActsInfo, appSubResrcInfo, configRsrcResrcInfo []view.InfoItem
	for rName, rDesc := range PermittedRuleTypes {
		rulesInfo = append(rulesInfo, view.InfoItem{
			Name: rName,
			Desc: rDesc,
		})
	}
	for name, desc := range PermittedPrefixMap {
		prefixesInfo = append(prefixesInfo, view.InfoItem{
			Name: name,
			Desc: desc,
		})
	}

	for _, name := range PermittedActLst {
		allActsInfo = append(allActsInfo, view.InfoItem{
			Name: name,
			Desc: PermittedActMap[name],
		})
	}

	for _, name := range NormalAct {
		normalActsInfo = append(normalActsInfo, view.InfoItem{
			Name: name,
			Desc: GetActCnName(name),
		})
	}

	for _, name := range PermittedSubResourceList {
		appSubResrcInfo = append(appSubResrcInfo, view.InfoItem{
			Name: name,
			Desc: PermittedSubResource[name],
		})
	}

	for name, desc := range PermittedConfigRsrcSubResource {
		configRsrcResrcInfo = append(configRsrcResrcInfo, view.InfoItem{
			Name: name,
			Desc: desc,
		})
	}

	return view.ResPmsCommonInfo{
		RulesInfo:                  rulesInfo,
		PrefixesInfo:               prefixesInfo,
		AllActsInfo:                allActsInfo,
		NormalActsInfo:             normalActsInfo,
		AppSubResourcesInfo:        appSubResrcInfo,
		ConfigRsrcSubResourcesInfo: configRsrcResrcInfo,
		DomainCascader:             GetDomainCascaderOptions(iid),
	}
}

// Note, this function only check target uid is root or not, do not check current system is locked or not! use it carefully!
func IsRootWithoutCheckingSysLock(uid int) bool {
	uidStr := strconv.Itoa(uid)
	subjectFieldStr, err := Assemble2CasbinStr(PrefixUser, uidStr)
	if err != nil { // if userId is empty, then will return err
		return false
	}
	invoker.Logger.Debug("pmsplugin", elog.Any("uid", uid), elog.Any("subjectFieldStr", subjectFieldStr))

	g3s := enforcer.GetFilteredNamedGroupingPolicy(RuleTypeG3, 0, subjectFieldStr, "role__root")
	invoker.Logger.Debug("pmsplugin", elog.Any("g3s", g3s))
	return len(g3s) > 0
}

// EnsureRuleExist: ensure the rule exist in casbin
func EnsureRuleExist(ruleType string, ruleItems ...string) (err error) {
	if ruleType == RuleTypeP {
		rules := enforcer.GetFilteredPolicy(0, ruleItems...)
		if len(rules) > 0 {
			return nil
		}
	} else {
		rules := enforcer.GetFilteredNamedGroupingPolicy(ruleType, 0, ruleItems...)
		if len(rules) > 0 {
			return nil
		}
	}
	newRule := make([]interface{}, len(ruleItems))
	for i := 0; i < len(ruleItems); i++ {
		newRule[i] = ruleItems[i]
	}
	_, err = AddRule(ruleType, newRule...)
	return err
}

// Enforce : check permission
func Enforce(params ...interface{}) (bool, error) {
	enforcerLock.Lock()
	defer enforcerLock.Unlock()
	return enforcer.Enforce(params...)
}

// EnforceOneInMany : check many rules, if one of them has passed then return true.
func EnforceOneInMany(rules ...[]interface{}) (bool, error) {
	enforcerLock.Lock()
	defer enforcerLock.Unlock()
	results, err := enforcer.BatchEnforce(rules)
	for _, isPass := range results {
		if isPass {
			return true, nil
		}
	}
	return false, err
}

// Enforce : check permission
func EnforceEX(params ...interface{}) (bool, []string, error) {
	enforcerLock.Lock()
	defer enforcerLock.Unlock()
	return enforcer.EnforceEx(params...)
}

func EnforcerLoadPolicy() {
	_ = enforcer.LoadPolicy()
}
