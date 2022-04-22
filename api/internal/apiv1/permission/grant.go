package permission

import (
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/service/permission"
	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/view"

	"strconv"
)

func GetTablePmsRolesGrant(c *core.Context) {
	aid := cast.ToInt(c.Param("id"))
	if aid == 0 {
		c.JSONE(1, "invalid app id. ", nil)
		return
	}
	reqParam := view.RoleGrantInfoFilter{}
	_ = c.Bind(&reqParam)
	reqPerm := view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixTable,
		ObjectIdx:   strconv.Itoa(aid),
		SubResource: pmsplugin.PrefixRole,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  reqParam.DomainType,
		DomainId:    strconv.Itoa(reqParam.DomainId),
	}
	if err := permission.Manager.CheckNormalPermission(reqPerm); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	reqParam.GrantObjectType = pmsplugin.PrefixUser
	reqParam.ResourceType = pmsplugin.PrefixTable
	reqParam.ResourceId = aid
	appGrantInfo, err := permission.Manager.GetAppRolesGrantInfo(&reqParam)
	if err != nil {
		c.JSONE(1, "获取角色授权信息失败. "+err.Error(), nil)
		return
	}
	c.JSONOK(appGrantInfo)
}

func UpdateAppPmsRolesGrant(c *core.Context) {
	aid := cast.ToInt(c.Param("id"))
	if aid == 0 {
		c.JSONE(1, "无效的appId. ", nil)
		return
	}
	reqParam := permission.AppPmsRolesWithGrantInfo{}
	err := c.Bind(&reqParam)
	if err != nil {
		c.JSONE(1, "无效的请求参数.", err)
		return
	}
	if aid != reqParam.Aid {
		c.JSONE(1, "请求参数中的aid与url中的不相同.", nil)
		return
	}
	reqPerm := view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixTable,
		ObjectIdx:   strconv.Itoa(aid),
		SubResource: pmsplugin.PrefixRole,
		Acts:        []string{pmsplugin.ActGrant},
		DomainType:  pmsplugin.SystemDom,
	}
	if err := permission.Manager.CheckNormalPermission(reqPerm); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	err = permission.Manager.UpdateAppRolesGrantInfo(&reqParam)
	if err != nil {
		c.JSONE(1, "更新应用角色授权信息失败. "+err.Error(), nil)
		return
	}
	c.JSONOK()
}
