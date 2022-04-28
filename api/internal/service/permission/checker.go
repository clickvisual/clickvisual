package permission

import (
	"fmt"

	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type (
	iBaseChecker interface {
		// CheckDomLockIfActWrite check target req.Domain is locked or not when req.Acts contain write(i.e. not 'view') kind operation(s)
		CheckDomLockIfActWrite(req *view.ReqPermission) error
	}

	baseChecker struct{}
)

// CheckDomLockIfActWrite check target dom(which request) is locked or not when reqActs contain write kind operation(s).
// Do domLockStatus checking only if the reqAct != "view".
// Note, this func will return error(i.e. pms check not pass) if target dom is locked even reqUser is root
func (b *baseChecker) CheckDomLockIfActWrite(reqParam *view.ReqPermission) error {
	// if reqAct is "view" i.e. readonly, then return nil directly
	if len(reqParam.Acts) == 1 && reqParam.Acts[0] == pmsplugin.ActView {
		if reqParam.DomainType == pmsplugin.SystemDom {
			reqParam.DomainType = ""
		}
		return nil
	}

	// 1. Do some special processes before checking lock status of target domain if needed.

	// 2. check normal req.Domain is locked or not
	_, isReqDomValid := pmsplugin.PermittedDomPrefixMap[reqParam.DomainType]
	if !isReqDomValid {
		return fmt.Errorf(MsgInvalidReqDomType)
	}
	switch reqParam.DomainType {
	case pmsplugin.SystemDom:
		reqParam.DomainType = ""
	case pmsplugin.PrefixDatabase:
	case pmsplugin.PrefixTable:
	default:
		return fmt.Errorf("target reqDomType %s has not been supported checking in pms yet", reqParam.DomainType)
	}
	return nil
}
