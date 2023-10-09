package permission

import (
	"fmt"
	"strconv"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// UserPmsChecker ...
type UserPmsChecker interface {
	iBaseChecker
	Check(reqPms view.ReqPermission) error // if err == nil, means reqPermission passed
}

// Special pmsCheckStrategies for special resource permission check for user
// ObjectType -> SubResource -> UserPmsChecker.
// Note, "ObjectType" and "SubResource" are the properties of view.ReqPermission
var strategies = map[string]map[string]UserPmsChecker{
	pmsplugin.PrefixInstance: {},
}

// create a UserPmsChecker Strategy
func (p *pms) newUserPmsCheckStrategy(objType, subResource string) UserPmsChecker {
	subResourceCheckerMap, objOk := strategies[objType]
	if !objOk {
		return &defaultChecker{}
	}
	checker, exist := subResourceCheckerMap[subResource]
	if !exist {
		return &defaultChecker{}
	}
	return checker
}

type (
	defaultChecker struct{ baseChecker } // default checker, check all normal permission for user
)

// Check used for 99% cases (normal) permission check
func (s *defaultChecker) Check(reqPms view.ReqPermission) error {
	// 1. check permission which has no domain
	if reqPms.ObjectType == pmsplugin.PrefixRoute {
		// TODO: check route permission
		return nil
	}
	// 3. normal check by casbin
	if isRootUser(reqPms.UserId) {
		return nil
	}
	items, err := getCasbinItemsFromReqPermission(&reqPms)
	if err != nil {
		return errors.Wrap(err, "reqPermission is invalid")
	}
	var reqRules [][]interface{}
	reqRules = append(reqRules, pmsplugin.Convert2InterfaceSlice(items.ReqSub, items.ReqObj, items.ReqAct, items.ReqDom))
	reqRules = append(reqRules, checkAsterisk(reqPms)) // add * permission check
	pmsPassed, err := pmsplugin.EnforceOneInMany(reqRules...)
	if err != nil {
		elog.Warn("reqPerm not pass", zap.Error(err))
	}
	if !pmsPassed {
		return errors.New(MsgNoPermission)
	}
	return nil
}

// checkAsterisk check *
func checkAsterisk(reqPms view.ReqPermission) []interface{} {
	res := make([]interface{}, 0)
	reqPms.UserId = -1
	items, err := getCasbinItemsFromReqPermission(&reqPms)
	if err != nil {
		return res
	}
	elog.Debug("Permission", elog.Any("items", items))
	return pmsplugin.Convert2InterfaceSlice(items.ReqSub, items.ReqObj, items.ReqAct, items.ReqDom)
}

// --- below are private materials... used above
func isRootUser(uid int) bool {
	if uid <= 0 {
		return false
	}
	return pmsplugin.IsRootWithoutCheckingSysLock(uid)
}

type casbinItemsFromReqPermission struct {
	ReqSub string
	ReqObj string
	ReqAct string
	ReqDom string
}

// check reqPermission validation, and trans it to itemStrings of casbinRule
func getCasbinItemsFromReqPermission(reqPms *view.ReqPermission) (casbinItemsFromReqPermission, error) {
	resp := casbinItemsFromReqPermission{}
	if reqPms.UserId == 0 || reqPms.ObjectType == "" || reqPms.ObjectIdx == "" || reqPms.SubResource == "" {
		return resp, errors.New("The UserId, ObjectType, ObjectIdx and SubRersource cannot be empty.")
	}
	if _, valid := pmsplugin.PermittedPrefixMap[reqPms.ObjectType]; !valid {
		return resp, errors.New(fmt.Sprintf("ObjectType(%s) is invalid", reqPms.ObjectType))
	}
	reqSub, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(reqPms.UserId))
	reqObj, _ := pmsplugin.Assemble2CasbinStr(reqPms.ObjectType, reqPms.ObjectIdx, pmsplugin.PrefixSubRsrc, reqPms.SubResource)
	reqAct := pmsplugin.JointActs2RuleActStr(reqPms.Acts...)
	if reqAct == "" {
		reqAct = "*"
	}
	reqDom, err := pmsplugin.Assemble2CasbinStr(reqPms.DomainType, reqPms.DomainId)
	if err != nil {
		elog.Error("pms", elog.Any("step", "Assemble2CasbinStr"), elog.Any("error", err.Error()))
		reqDom = "*"
	}
	resp.ReqSub = reqSub
	resp.ReqObj = reqObj
	resp.ReqAct = reqAct
	resp.ReqDom = reqDom
	return resp, nil
}
