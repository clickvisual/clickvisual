package permission

import (
	"strconv"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/permission"
	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func GetPmsCommonInfo(c *core.Context) {
	c.JSONOK(pmsplugin.GetPmsCommonInfo())
}

func CheckPermission(c *core.Context) {
	// do not check permission currently
	// c.JSONOK()
	// return
	var err error
	reqPerm := view.ReqPermission{}
	err = c.Bind(&reqPerm)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if reqPerm.ObjectType == "root" {
		// TODO: using IsRootUserAndDomNotLock instead
		err = permission.Manager.IsRootUser(c.Uid())
		if err != nil {
			c.JSONE(1, err.Error(), nil)
			return
		}
		c.JSONOK()
		return
	}
	if _, valid := pmsplugin.PermittedPrefixMap[reqPerm.ObjectType]; !valid {
		c.JSONE(1, permission.MsgInvalidReqObjectType, nil)
		return
	}
	if reqPerm.UserId == 0 {
		reqPerm.UserId = c.Uid()
	}
	// if objectIdx is appName
	if _, err := strconv.Atoi(reqPerm.ObjectIdx); err != nil && reqPerm.ObjectType == pmsplugin.PrefixTable {
		tid, err := strconv.Atoi(reqPerm.ObjectIdx)
		if err != nil {
			c.JSONE(1, "invalid appId "+reqPerm.ObjectIdx, err.Error())
			return
		}
		tableInfo, err := db.TableInfo(invoker.Db, tid)
		if err != nil {
			c.JSONE(1, "not found app by id "+reqPerm.ObjectIdx, err.Error())
			return
		}
		reqPerm.ObjectIdx = strconv.Itoa(tableInfo.ID)
	}
	if err := permission.Manager.CheckNormalPermission(reqPerm); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK()
}
