package service

import (
	"strconv"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func TableIsPermission(uid, iid, tid int, subResource string) bool {
	// check database permission
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      uid,
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: subResource,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tid),
	}); err == nil {
		invoker.Logger.Debug("ReadAllPermissionInstance",
			elog.Any("uid", uid),
			elog.Any("step", "IsPermissionDatabase"),
			elog.Any("iid", iid),
			elog.Any("tid", tid),
			elog.Any("subResource", subResource))
		return true
	}
	invoker.Logger.Warn("ReadAllPermissionInstance",
		elog.Any("uid", uid),
		elog.Any("step", "IsPermissionDatabase"),
		elog.Any("iid", iid),
		elog.Any("tid", tid),
		elog.Any("subResource", subResource))
	return false
}
