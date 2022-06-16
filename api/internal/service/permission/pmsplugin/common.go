package pmsplugin

import (
	"sort"
	"strconv"
	"strings"

	casbin_util "github.com/casbin/casbin/v2/util"
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

/*
我们约定:
	1. 对用户的授权一律使用角色去授予, 即使用 g 或者 g3 规则配合使用 "role__***"去授权.
		Q: 何时用g规则? 何时用g3规则?
		A: if 授权时, 没有设置domain信息 || 设置的domain为空 || domain为*, 则使用g3规则写至casbin_rule表中;
           if 授权时, 有合法的domain配置, 则使用g规则写至casbin_rule表中
	2. role__*** 的具体资源和action 一律使用p规则去定义
	3. role__***的具体格式:  role__{{ROLE-ID}}__{{VALID-PREFIX}}__{{REFER-ID}}
		注意各{{xxx}}项的顺序不能乱, 从左至右依次为:
		{{ROLE-ID}}是 "pms_role"表中具体角色记录的id. 注:"pms_role"与"pms_role_detail"用于管理casbin的p规则; pms_role_ref表用于记录角色所属resource的授权
		{{VALID-PREFIX}}是角色所属资源的类型(如 "app"), 被记录与pms_role表的BelongResource字段;
		{{REFER-ID}}是对应所属资源类型对象的id(比如, 如果VALID-PREFIX是app, 那么这里的REFER-ID的值就代表一个具体app的id)
	4. 当前 角色(role)之间不允许继承(虽然casbin的g 和 g2 可以用于角色的继承传递, 但业务代码当前暂没实现角色的继承. 后续如果需要,可以将pms_role表的InheritRoleId注释打开并增加业务逻辑来支持.)
	5. 当前还没有支持 g2 规则的授权使用.
	6. 对于含有*的字符串, 需要特别注意: * 的位置一定要放到字符串的末尾!! 例如:
		对于app的subResource, 如果要使用 * 去表示一个app的所有subResource,
		那么应该写成 app__{ID}__subResource__*
		不能写成 subResource__*__app__{ID}  i.e. 如果 * 在字符串中间位置, 那么casbin model中的keyMatch会让所有app的都通过!
			如 给userA授权了 subResource__*__app__1 那么 userA 也能访问 subResource__*__app__{AnyID}


*/

const (
	RuleTypeP  = "p"
	RuleTypeG  = "g"
	RuleTypeG2 = "g2"
	RuleTypeG3 = "g3"
)

var PermittedRuleTypes = map[string]string{
	RuleTypeP:  "普通规则_p(in domain)",
	RuleTypeG:  "角色规则_g(in domain)",
	RuleTypeG2: "资源规则_g2(no domain)",
	RuleTypeG3: "角色规则_g3(ignore domain)",
}

var PermittedUserRuleMap = map[string]struct{}{
	RuleTypeP:  {},
	RuleTypeG:  {},
	RuleTypeG3: {},
}

var PermittedGroupingRuleMap = map[string]struct{}{
	RuleTypeG:  {},
	RuleTypeG2: {},
	RuleTypeG3: {},
}

// because the results which returned by casbin api without "pType" (i.e. p, g, g2, g3),
// we need to using the below struct to wrap the results which casbin api returned when we searching against casbin api.
type EnhancedCasbinRulesItem struct {
	Ptype string     `json:"pType"` // used to distinguish the type of rules which casbin api returned.
	Rules [][]string `json:"rules"` // the origin results which casbin api returned.
}

/*
TODO: need to implement a function?  for Getting the RoleNameList Of gx_list(a list of "g", g2 or g3 roleDefinitions)
*/

const SEP = "__" // the Separator using in sub, obj and dom

// prefix const
const (
	PrefixRoute    = "route"
	PrefixInstance = "instance"     // using in obj or g2;
	PrefixMenu     = "menu"         // using in obj
	PrefixSubRsrc  = "subResource"  // using in obj of p rule.
	PrefixUser     = "user"         // using in sub, g, g2, g3; e.g. PrefixUser +  SEP + UID, i.e. user__123
	PrefixRole     = "role"         // using in sub, g or g3;   e.g. PrefixRole +  SEP + R-NAME + [...], i.e. "role__root" or "role__admin__app__svc-user"
	PrefixGroup    = "group"        // using in p.obj or g2;	e.g. PrefixGroup + SEP + G-NAME + [...], i.e. group__admin
	PrefixDatabase = "BaseDatabase" // using            			e.g. PrefixEnt +   SEP + ENT-ID, i.e. ent__1
	PrefixTable    = "BaseTable"    // using in dom;
)

// 对于以下这个Map,  其key: 当前Casbin的sub, obj, dom字符中允许的prefix;  value: 对应的中文名
var PermittedPrefixMap = map[string]string{
	PrefixRoute:    "路由",
	PrefixInstance: "实例",
	PrefixSubRsrc:  "子资源",
	PrefixMenu:     "菜单",
	PrefixUser:     "用户",
	PrefixRole:     "角色",
	PrefixGroup:    "组",
	PrefixDatabase: "数据库",
	PrefixTable:    "日志表",
}

func GetPrefixCnName(enPrefix string) string {
	if cnName, ok := PermittedPrefixMap[enPrefix]; ok {
		return cnName
	}
	return ""
}

// only support "role" in first item of p rule currently. TODO: support other prefix in future.
var PermittedPrefixInP0 = map[string]string{
	PrefixRole: "角色",
}

// current only support ent and env in dom.  TODO: support other types in dom
var PermittedDomPrefixMap = map[string]string{
	SystemDom:      "系统",
	PrefixDatabase: "数据库",
	PrefixTable:    "日志表",
}

const SystemDom = "system"

const AllDom = "dom*" // used as an option in domainCascadeSelector.

// Note, the dom string like ent__n
func GetDomTypeAndId(domStr string) (domType string, domId int) {
	if !strings.Contains(domStr, SEP) {
		return
	}
	splitStr := strings.Split(domStr, SEP)
	if len(splitStr) != 2 {
		return
	}
	if _, valid := PermittedDomPrefixMap[splitStr[0]]; !valid {
		return
	}
	domId, err := strconv.Atoi(splitStr[1])
	if err != nil {
		return
	}
	return splitStr[0], domId
}

// a prefix(string) will returned if target str contains a valid prefix, otherwise will return an empty string.
func GetPrefixOfString(str string) (prefix string) {
	firstSepIdx := strings.Index(str, SEP)
	if firstSepIdx == -1 {
		return ""
	}
	prefix = str[:firstSepIdx]
	// if the prefix is not valid then return empty string
	if _, valid := PermittedPrefixMap[prefix]; !valid {
		return ""
	}
	return prefix
}

// remove the empty string i.e. "" from the original []string
func removeEmptyItems(origStrSlice []string) (result []string) {
	for _, str := range origStrSlice {
		if trimStr := strings.TrimSpace(str); trimStr != "" {
			result = append(result, trimStr)
		}
	}
	return
}

/*
	Aim: join item strings by SEP "__" for casbin policy string
	Note that:
		the first parameter i.e. items[0] must be a PermittedPrefix \
		&& the length of parameters must GT (great than) 1 \
		&& parameters cannot contain empty string item(s)
        --------
		otherwise will return empty string "" and error
*/
func Assemble2CasbinStr(items ...string) (string, error) {
	if len(items) <= 1 {
		return "", errors.New("the length of parameters must > 1")
	}
	itemsWithoutEmptyStr := removeEmptyItems(items)
	if len(items) != len(itemsWithoutEmptyStr) {
		return "", errors.New("empty string is not permitted in parameters")
	}
	if _, valid := PermittedPrefixMap[items[0]]; !valid {
		return "", errors.New("the first parameter is not a permitted prefix")
	}
	return strings.Join(items, SEP), nil
}

func SplitCasbinUnActStr(casbinItemStr string) (items []string, err error) {
	if !strings.Contains(casbinItemStr, SEP) {
		return items, errors.New("invalid casbinItemString")
	}
	items = strings.Split(casbinItemStr, SEP)
	return
}

// 角色相关常量
const (
	ROLE_ADMIN = "admin"
)

// Action相关常量
const (
	ActFull   = "*"
	ActView   = "view"
	ActEdit   = "edit"
	ActDelete = "delete"
	ActGrant  = "grant"
)

var PermittedActLst = []string{ActFull, ActView, ActEdit, ActDelete, ActGrant}
var PermittedActMap = map[string]string{
	ActFull:   "All(全部)",
	ActView:   "只读",
	ActEdit:   "编辑",
	ActDelete: "删除",
	ActGrant:  "授权",
}

func GetActCnName(enAct string) string {
	if cnName, ok := PermittedActMap[enAct]; ok {
		return cnName
	}
	return ""
}

var NormalAct = []string{ActFull, ActView, ActEdit}
var AppDeployAct = []string{ActFull, ActEdit, ActView}

// ActionCheck in matchers of model file:  (p.act == 'edit' && r.act == 'view' || keyMatch(r.act, p.act) || regexMatch(r.act,p.act))
func IsActMatched(reqAct string, policyAct string) bool {
	if policyAct == "edit" && reqAct == "view" {
		return true
	}
	if casbin_util.KeyMatch(reqAct, policyAct) {
		return true
	}
	if casbin_util.KeyMatch2(reqAct, policyAct) {
		return true
	}
	// matched, _ := regexp.MatchString(policyAct, reqAct)
	// if matched {
	// 	return true
	// }
	return false
}

// DomCheck in matchers of model file: keyMatch(r.dom, p.dom)
func IsDomMatched(reqDom string, policyDom string) bool {
	return casbin_util.KeyMatch(reqDom, policyDom)
}

// join acts e.g. ["edit","exec"] to regex string like "(edit)|(exec)"
// if the length of validActs (i.e. permittedActs) < 1, will return emptyString, ==1 will return original string
func JointActs2RuleActStr(acts ...string) string {
	validActs := make([]string, 0)
	for _, act := range acts {
		if _, valid := PermittedActMap[act]; valid {
			validActs = append(validActs, act)
		}
	}
	if len(validActs) < 1 {
		return ""
	}
	if len(validActs) == 1 {
		return validActs[0]
	}
	sort.Strings(validActs)
	return strings.Join(validActs, "|")
}

// 资源 常量
const (
	AllRsrc         = "*"
	Role            = "role"
	InstanceBase    = "base"
	Alarm           = "alarm"
	CollectionRules = "collectionRules"
	FieldManagement = "fieldManagement"
)

var PermittedSubResourceList = []string{AllRsrc, Role, InstanceBase, Alarm, CollectionRules, FieldManagement}
var PermittedSubResource = map[string]string{
	AllRsrc:         "All(全部)",
	InstanceBase:    "基础操作",
	Alarm:           "告警操作",
	CollectionRules: "数据采集规则",
	FieldManagement: "分析字段配置",
	Role:            "角色操作",
}

var PermittedAppAdminGrantSubResource = map[string]string{}

const (
	ConfigRsrcAll = "*"
)

var PermittedConfigRsrcSubResource = map[string]string{
	ConfigRsrcAll: "全部(all)",
}

func GetAppSubResourceCnName(enSubR string) string {
	if cnName, ok := PermittedSubResource[enSubR]; ok {
		return cnName
	}
	return ""
}

func GetValidRoleStrByRoleItem(roleItem view.RoleItem) (res string, err error) {
	res, err = Assemble2CasbinStr(PrefixRole, roleItem.RoleName, roleItem.BelongType, strconv.Itoa(roleItem.ReferId))
	if err != nil {
		return res, errors.Wrap(err, "invalid RoleItem")
	}
	var isRoleItemValid = false
	// 1. check belongType
	if _, valid := PermittedPrefixMap[roleItem.BelongType]; !valid {
		return "", errors.New("invalid BelongType")
	}
	// 2. check role name
	// 2.1 check in default_role_pms first
	defaultRolePmsList, err := db.GetDefaultRolePmsList(db.Conds{
		"belong_type": roleItem.BelongType,
		"role_name":   roleItem.RoleName,
	})
	if err != nil {
		return "", errors.Wrap(err, "check validation of RoleItem by PmsDefaultRole err")
	}
	if len(defaultRolePmsList) > 0 {
		isRoleItemValid = true
	}
	// 2.2 if roleItem is invalid, then check custom_role_pms
	if !isRoleItemValid {
		customRolePmsList, err := db.GetCustomRolePmsList(db.Conds{
			"belong_type": roleItem.BelongType,
			"role_name":   roleItem.RoleName,
			"refer_id":    roleItem.ReferId,
		})
		if err != nil {
			return "", errors.Wrap(err, "check validation of RoleItem by PmsCustomRole err")
		}
		if len(customRolePmsList) > 0 {
			isRoleItemValid = true
		}
	}
	// TODO: support g2 resource role, i.e. using ReferGroup of RoleItem
	if isRoleItemValid {
		return res, nil
	}
	return res, errors.New("invalid RoleItem")
}

func CmpUserIds2GetNewAndRmUserIds(currentUids []int, futureUids []int) (isEqual bool, needAddUids []int, needRmUids []int) {
	needAddUids = make([]int, 0)
	needRmUids = make([]int, 0)
	if len(currentUids) == 0 {
		needAddUids = futureUids
		return len(needAddUids) == 0 && len(needRmUids) == 0, needAddUids, needRmUids
	}
	if len(futureUids) == 0 {
		needRmUids = currentUids
		return len(needAddUids) == 0 && len(needRmUids) == 0, needAddUids, needRmUids
	}

	var currentUidsMap = make(map[int]struct{})
	for _, cUid := range currentUids {
		currentUidsMap[cUid] = struct{}{}
	}
	cmpFunc := func(a, b interface{}) bool { return a.(int) == b.(int) }
	// compare two slice and find out needAdd and needRm:
	for _, futureUid := range futureUids {
		if idx := utils.FindIndex(currentUids, futureUid, cmpFunc); idx == -1 {
			// if currentUids not contain futureUid, then the futureUid is a needAddUid
			needAddUids = append(needAddUids, futureUid)
		} else {
			// futureUid exist in currentUids
			delete(currentUidsMap, futureUid)
		}
	}
	if len(currentUidsMap) > 0 {
		for residualCurrentUid, _ := range currentUidsMap {
			needRmUids = append(needRmUids, residualCurrentUid)
		}
	}
	return len(needAddUids) == 0 && len(needRmUids) == 0, needAddUids, needRmUids
}

func IsStringSliceEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}

	if (a == nil) != (b == nil) {
		return false
	}

	var aMap = make(map[string]int)
	for _, v := range a {
		if _, exist := aMap[v]; !exist {
			aMap[v] = 0
		} else {
			aMap[v]++
		}
	}
	for _, bItem := range b {
		if _, exist := aMap[bItem]; !exist {
			return false
		}
		aMap[bItem]--
		if aMap[bItem] < 0 {
			delete(aMap, bItem)
		}
	}
	return len(aMap) == 0
}

func Convert2InterfaceSlice(builtinItems ...interface{}) (res []interface{}) {
	res = make([]interface{}, len(builtinItems))
	for idx, v := range builtinItems {
		res[idx] = v
	}
	return res
}

func GetDomainCascaderOptions(iid int) (resp view.RespDomainCascader) {
	resp = append(resp, view.CascaderItem{
		Value: AllDom,
		Label: "全部",
	})
	condsDatabases := egorm.Conds{}
	if iid != 0 {
		condsDatabases["iid"] = iid
	}
	entWithDatabase, err := db.DatabaseList(invoker.Db, condsDatabases)
	if err != nil {
		invoker.Logger.Error("Get all enterprise for domain cascade selector error.", zap.Error(err))
		return
	}
	if len(entWithDatabase) <= 0 {
		return
	}
	entCascade := view.CascaderItem{
		Value:    PrefixDatabase,
		Label:    "数据库",
		Children: make([]view.CascaderItem, 0),
	}
	envCascade := view.CascaderItem{
		Value:    PrefixTable,
		Label:    "日志库",
		Children: make([]view.CascaderItem, 0),
	}
	for _, ent := range entWithDatabase {
		invoker.Logger.Debug("entWithDatabase", elog.Any("ent", ent))
		if ent.Instance == nil {
			continue
		}
		entCascade.Children = append(entCascade.Children, view.CascaderItem{
			Value: strconv.Itoa(ent.ID),
			Label: ent.Name,
		})
		conds := egorm.Conds{}
		conds["did"] = ent.ID
		tables, _ := db.TableList(invoker.Db, conds)
		if len(tables) <= 0 {
			continue
		}
		childrenEnt := view.CascaderItem{
			Value:    strconv.Itoa(ent.ID),
			Label:    ent.Name,
			Children: make([]view.CascaderItem, 0),
		}
		for _, env := range tables {
			childrenEnt.Children = append(childrenEnt.Children, view.CascaderItem{
				Value: strconv.Itoa(env.ID),
				Label: env.Name,
			})
		}
		envCascade.Children = append(envCascade.Children, childrenEnt)
	}
	if len(entCascade.Children) > 0 {
		resp = append(resp, entCascade)
	}
	if len(envCascade.Children) > 0 {
		resp = append(resp, envCascade)
	}
	return
}
