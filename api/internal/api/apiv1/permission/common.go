package permission

import (
	"strconv"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// @Tags         PREMISSION
func GetPmsCommonInfo(c *core.Context) {
	var err error
	reqPerm := view.ReqPmsCommonInfo{}
	err = c.Bind(&reqPerm)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(pmsplugin.GetPmsCommonInfo(reqPerm.Iid))
}

// @Tags         PREMISSION
func CheckPermission(c *core.Context) {
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
	if _, err = strconv.Atoi(reqPerm.ObjectIdx); err != nil && reqPerm.ObjectType == pmsplugin.PrefixInstance {
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
	if err = permission.Manager.CheckNormalPermission(reqPerm); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK()
}
