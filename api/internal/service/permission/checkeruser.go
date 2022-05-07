package permission

import (
	"fmt"
	"strconv"

	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
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

// used for 99% cases (normal) permission check
func (s *defaultChecker) Check(reqPms view.ReqPermission) error {
	invoker.Logger.Info("request check permission", zap.Any("data", reqPms))
	// 1. check permission which has no domain
	if reqPms.ObjectType == pmsplugin.PrefixRoute {
		// TODO: check route permission
		invoker.Logger.Info("==> route always pass currently.")
		return nil
	}

	// // 2. check req domain lock or not
	// err := s.CheckDomLockIfActWrite(&reqPms)
	// if err != nil {
	// 	return err
	// }

	// 3. normal check by casbin
	if isRootUser(reqPms.UserId) {
		return nil
	}

	items, err := getCasbinItemsFromReqPermission(&reqPms)
	if err != nil {
		err = fmt.Errorf("ReqPermission is invalid. %w", err)
		invoker.Logger.Error(err.Error())
		return err
	}
	invoker.Logger.Debug("pms", elog.Any("items", items))

	var reqRules [][]interface{}
	reqRules = append(reqRules, pmsplugin.Convert2InterfaceSlice(items.ReqSub, items.ReqObj, items.ReqAct, items.ReqDom))
	// result, err := pmsplugin.Enforce(reqSub, reqObj, reqAct, reqDom)

	// if items.ReqDom != "*" && reqPms.DomainType == pmsplugin.PrefixTable {
	// 	// 如果请求的dom是env类型的，除了直接验证包含env的rule，还需要验证包含该env所属ent的rules
	// 	tid, err := strconv.Atoi(reqPms.DomainId)
	// 	if err == nil && tid > 0 {
	// 		obj, err := db.TableInfo(invoker.Db, tid)
	// 		if err == nil {
	// 			if obj.Database == nil {
	// 				return fmt.Errorf(MsgInvalidReqObjectType)
	// 			}
	// 			reqEntDom, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixDatabase, strconv.Itoa(obj.Database.ID))
	// 			reqRules = append(reqRules, pmsplugin.Convert2InterfaceSlice(items.ReqSub, items.ReqObj, items.ReqAct,
	// 				reqEntDom))
	// 		}
	// 	}
	// }
	invoker.Logger.Debug("pms", elog.Any("reqRules", reqRules))
	pmsPassed, err := pmsplugin.EnforceOneInMany(reqRules...)
	if err != nil {
		invoker.Logger.Warn("reqPerm not pass", zap.Error(err))
	}
	if !pmsPassed {
		return fmt.Errorf(MsgNoPermission)
	}
	return nil
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
		return resp, fmt.Errorf("The UserId, ObjectType, ObjectIdx and SubRersource cannot be empty. ")
	}
	if _, valid := pmsplugin.PermittedPrefixMap[reqPms.ObjectType]; !valid {
		return resp, fmt.Errorf("ObjectType(%s) is invalid", reqPms.ObjectType)
	}

	reqSub, _ := pmsplugin.Assemble2CasbinStr(pmsplugin.PrefixUser, strconv.Itoa(reqPms.UserId))
	reqObj, _ := pmsplugin.Assemble2CasbinStr(reqPms.ObjectType, reqPms.ObjectIdx, pmsplugin.PrefixSubRsrc, reqPms.SubResource)
	reqAct := pmsplugin.JointActs2RuleActStr(reqPms.Acts...)
	if reqAct == "" {
		reqAct = "*"
	}
	reqDom, err := pmsplugin.Assemble2CasbinStr(reqPms.DomainType, reqPms.DomainId)
	if err != nil {
		invoker.Logger.Error("pms", elog.Any("step", "Assemble2CasbinStr"), elog.Any("error", err.Error()))
		reqDom = "*"
	}
	resp.ReqSub = reqSub
	resp.ReqObj = reqObj
	resp.ReqAct = reqAct
	resp.ReqDom = reqDom
	return resp, nil
}
