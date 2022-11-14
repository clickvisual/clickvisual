package permission

import (
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"

	"strconv"
)

// @Tags         PREMISSION
func GetInstancePmsRolesGrant(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "invalid instance id. ", nil)
		return
	}
	reqParam := view.RoleGrantInfoFilter{}
	_ = c.Bind(&reqParam)
	reqPerm := view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.PrefixRole,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  reqParam.DomainType,
		DomainId:    strconv.Itoa(reqParam.DomainId),
	}
	if err := permission.Manager.CheckNormalPermission(reqPerm); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	reqParam.GrantObjectType = pmsplugin.PrefixUser
	reqParam.ResourceType = pmsplugin.PrefixInstance
	reqParam.ResourceId = iid
	instanceGrantInfo, err := permission.Manager.GetInstanceRolesGrantInfo(&reqParam)
	if err != nil {
		c.JSONE(1, "获取角色授权信息失败. "+err.Error(), nil)
		return
	}
	c.JSONOK(instanceGrantInfo)
}

// @Tags         PREMISSION
func UpdateInstancePmsRolesGrant(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "无效的 instance id: ", nil)
		return
	}
	reqParam := permission.InstancePmsRolesWithGrantInfo{}
	err := c.Bind(&reqParam)
	if err != nil {
		c.JSONE(1, "无效的请求参数.", err)
		return
	}
	if iid != reqParam.Iid {
		c.JSONE(1, "请求参数中的aid与url中的不相同.", nil)
		return
	}
	reqPerm := view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.PrefixRole,
		Acts:        []string{pmsplugin.ActGrant},
		DomainType:  pmsplugin.SystemDom,
	}
	if err = permission.Manager.CheckNormalPermission(reqPerm); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	err = permission.Manager.UpdateInstanceRolesGrantInfo(&reqParam)
	if err != nil {
		c.JSONE(1, "更新应用角色授权信息失败. "+err.Error(), nil)
		return
	}
	c.JSONOK()
}
