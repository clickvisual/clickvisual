package permission

import (
	"errors"
	"strconv"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/service/permission"
	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func PmsDefaultRoleList(c *core.Context) {
	// if current user is not root user, just return no permission
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	query := db.Conds{}
	if v := c.Query("belong_type"); v != "" {
		query["belong_type"] = v
	}
	if v := c.Query("role_name"); v != "" {
		query["role_name"] = v
	}
	res, err := permission.Manager.GetPmsDefaultRoles(query)
	if err != nil {
		c.JSONE(1, "获取权限默认角色列表失败", err.Error())
		return
	}
	c.JSONOK(res)
}

func PmsRoleList(c *core.Context) {
	reqParam := view.ReqPmsRoles{}
	err := c.Bind(&reqParam)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}

	roles, err := permission.Manager.GetPmsRoles(&reqParam)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK(roles)
}

func PmsRoleInfo(c *core.Context) {
	roleId := cast.ToInt(c.Param("id"))
	if roleId == 0 {
		c.JSONE(1, "无效的角色Id. ", nil)
		return
	}
	roleInfo, err := db.PmsRoleInfo(roleId)
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		c.JSONE(1, "获取角色信息失败.", err)
		return
	}
	c.JSONOK(roleInfo)
}

func CreatePmsRole(c *core.Context) {
	var err error
	reqModel := view.ReqNewPmsRole{}
	err = c.Bind(&reqModel)
	if err != nil {
		c.JSONE(1, "params invalid: "+err.Error(), nil)
		return
	}
	if reqModel.RoleType == db.PmsRoleTypeDefault {
		if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
			c.JSONE(1, "IsRootUser: "+err.Error(), nil)
			return
		}
	} else if reqModel.RoleType == db.PmsRoleTypeCustom {
		// for custom pmsRole's creation, the resourceId cannot be empty.
		if reqModel.ResourceId <= 0 {
			c.JSONE(1, "自定义角色的resourceId(所属资源ID)不可缺省.", nil)
			return
		}
		err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  reqModel.BelongResource,
			ObjectIdx:   strconv.Itoa(reqModel.ResourceId),
			SubResource: pmsplugin.Role,
			Acts:        []string{pmsplugin.ActEdit},
			DomainType:  pmsplugin.SystemDom,
		})
		if err != nil {
			c.JSONE(1, "CheckNormalPermission: "+err.Error(), nil)
			return
		}
	} else {
		c.JSONE(1, permission.MsgInvalidPmsRoleType, nil)
		return
	}
	err = permission.Manager.CreatePmsRole(&reqModel)
	if err != nil {
		c.JSONE(1, "CreatePmsRole: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func UpdatePmsRole(c *core.Context) {
	roleId := cast.ToInt(c.Param("id"))
	if roleId == 0 {
		c.JSONE(1, "无效的角色Id. ", nil)
		return
	}
	var err error
	reqModel := view.ReqUpdatePmsRole{}
	err = c.Bind(&reqModel)
	if err != nil {
		c.JSONE(1, "请求参数错误. "+err.Error(), nil)
		return
	}
	if reqModel.RoleType == db.PmsRoleTypeDefault {
		if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
			c.JSONE(1, err.Error(), nil)
			return
		}
	} else if reqModel.RoleType == db.PmsRoleTypeCustom {
		err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  reqModel.BelongResource,
			ObjectIdx:   strconv.Itoa(reqModel.ResourceId),
			SubResource: pmsplugin.Role,
			Acts:        []string{pmsplugin.ActEdit},
			DomainType:  pmsplugin.SystemDom,
		})
		if err != nil {
			c.JSONE(1, err.Error(), nil)
			return
		}
	} else {
		c.JSONE(1, permission.MsgInvalidPmsRoleType, nil)
		return
	}
	reqModel.ID = roleId
	err = permission.Manager.UpdatePmsRole(&reqModel)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK()
}

func DeletePmsRole(c *core.Context) {
	roleId := cast.ToInt(c.Param("id"))
	if roleId == 0 {
		c.JSONE(1, "无效的角色Id. ", nil)
		return
	}
	var err error
	reqModel := view.ReqDeletePmsRole{}
	err = c.Bind(&reqModel)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	targetPmsRole, err := db.PmsRoleInfo(roleId)
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		c.JSONE(1, "获取角色信息失败", err)
		return
	}
	if targetPmsRole.RoleType == db.PmsRoleTypeDefault {
		if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
			c.JSONE(1, err.Error(), nil)
			return
		}
	} else if targetPmsRole.RoleType == db.PmsRoleTypeCustom {
		err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  reqModel.BelongResource,
			ObjectIdx:   strconv.Itoa(reqModel.ResourceId),
			SubResource: pmsplugin.Role,
			Acts:        []string{pmsplugin.ActEdit},
			DomainType:  pmsplugin.SystemDom,
		})
		if err != nil {
			c.JSONE(1, err.Error(), nil)
			return
		}
	} else {
		c.JSONE(1, permission.MsgInvalidPmsRoleType, nil)
		return
	}
	reqModel.ID = roleId
	err = permission.Manager.DeletePmsRole(&reqModel)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK()
}

func GetRootUids(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	rootUids := permission.Manager.GetRootUsersId()
	resp := view.RootUsers{RootUids: rootUids}
	c.JSONOK(resp)

}

func GrantRootUids(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	var err error
	reqModel := view.RootUsers{}
	err = c.Bind(&reqModel)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	permission.Manager.GrantRootUsers(reqModel.RootUids)
	c.JSONOK()
}
