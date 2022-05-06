package permission

import "github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"

const (
	MsgNoPermission         = "权限验证未通过 (您当前无操作权限). "
	MsgInvalidPmsRoleType   = "权限角色类型非法. "
	MsgInvalidReqObjectType = "权限验证对象非法. "
	MsgInvalidReqDomType    = "无效的权限验证域. "
	MsgNeedRoot             = "需要root超级管理员权限. "
	MsgSysLocked            = "系统维护中... "
)

type PmsDomainType4Lock string

const (
	PmsSysDomainType PmsDomainType4Lock = pmsplugin.SystemDom
)
