package view

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

type (
	RespListUserGroup []ListGroupItem

	ReqUpdateGroup struct {
		OriginalName string `json:"name"`
		CurrentName  string `json:"current_name"`
	}

	ReqChangeUserGroup struct {
		UID    uint     `json:"uid"`
		Groups []string `json:"groups"`
	}

	ReqSetGroupAppPerm struct {
		GroupName string   `json:"group_name" valid:"required"`
		AppName   string   `json:"app_name" valid:"required"`
		Env       []string `json:"env"`
		Action    []string `json:"action"`
	}

	ReqSetGroupAPIPerm struct {
		GroupName string        `json:"group_name"`
		APIList   []APIListItem `json:"api_list"`
	}

	ReqSetGroupMenuPerm struct {
		GroupName string   `json:"group_name"`
		Menu      []string `json:"permission"`
	}

	RespListAppGroup []ListGroupItem

	ReqGetGroupMenuPerm struct {
		GroupName string `query:"group_name"`
	}

	ReqGetGroupAPIPerm struct {
		GroupName string `query:"group_name" valid:"required"`
	}

	RespGetGroupAPIPerm []APIPermItem

	RespGetMenuPerm []string

	ReqChangeAppGroup struct {
		AppName   string `json:"app_name"`
		AppEnv    string `json:"app_env"`
		GroupName string `json:"group_name"`
	}

	ReqGetAppPerm struct {
		GroupName     string `json:"group_name"`
		AppNameSearch string `json:"app_name_search"`
		PageSize      uint   `json:"size"`
		Page          uint   `json:"page"`
	}

	RespGetAppPerm struct {
		List       []AppPermItem `json:"list"`
		Pagination Pagination    `json:"pagination"`
	}

	AppPermItem struct {
		Aid           int      `json:"aid"`
		AppName       string   `json:"app_name"`
		AvailableEnvs []string `json:"available_envs"` // 可选的环境
		AllowEnvs     []string `json:"allow_envs"`     // 可用的环境
	}

	ReqListUser struct {
		GroupName string `query:"group_name"`
		Search    string `query:"search"`
		Page      uint   `query:"page"`
		PageSize  uint   `query:"page_size"`
	}

	RespListUser struct {
		List       []ListUserItem `json:"list"`
		Pagination Pagination     `json:"pagination"`
	}

	ListUserItem struct {
		UID      uint     `json:"uid"`
		UserName string   `json:"user_name"`
		NickName string   `json:"nick_name"`
		Access   string   `json:"access"`
		Groups   []string `json:"groups"`
	}

	APIListItem struct {
		Path   string `json:"path"`
		Method string `json:"method"`
	}

	ListGroupItem struct {
		Name string `json:"name"`
	}

	APIPermItem struct {
		Method string `json:"method"`
		Path   string `json:"path"`
	}

	MenuTree []MenuTreeItem

	MenuTreeItem struct {
		Name     string   `json:"name"`
		Path     string   `json:"path"`
		Icon     string   `json:"icon"`
		Children MenuTree `json:"children"`
	}
)

type DomainUids map[string][]int // like {"ent__1":[uid1, uid2, ...], "*": [uids...]}  note, the key with value "*" means allDomain

type (
	RolePmsDetail struct {
		SubResources []string `json:"sub_resources"`
		Acts         []string `json:"acts"`
	}

	RoleItem struct {
		BelongType string          `json:"belong_type"` // value in PermittedPrefixMap
		ReferId    int             `json:"refer_id"`    // 所对应的belongType资源的id; 非0时, referGroup为空
		ReferGroup string          `json:"refer_group"` // 所对应的group名; 非空时, referId 为0
		RoleName   string          `json:"role_name"`   // 角色名称
		RoleDesc   string          `json:"role_desc"`   // 角色描述
		PmsDetails []RolePmsDetail `json:"pms_details"`
		DomainType string          `json:"domain_type"` // 角色所在domain类型 可为空
		DomainId   int             `json:"domain_id"`   // domainType不为空时, 对应的id; domainType为空时, 此处值为0
	}

	ResourceItem struct {
		Name string `json:"name"`
		Desc string `json:"desc"`
	}

	ActItem struct {
		Name string `json:"name"`
		Desc string `json:"desc"`
	}

	InfoItem struct {
		Name string `json:"name"`
		Desc string `json:"desc"`
	}

	// SubResources []ResourceItem

	AppRoleInfoItem struct {
		RoleItem `json:",inline"`
		// SubResources []ResourceItem		`json:"sub_resources"`  // 角色所对应app下的子资源
		// Acts 		[]ActItem			`json:"acts"`			// 角色对app子资源的action
		// PmsDetails 		[]RolePmsDetail `json:"pms_details"`
		Uids []int `json:"uids"` // 当前是该角色的用户的id
	}

	TableRolesAssignmentInfo struct {
		AppId     int               `json:"app_id"`
		RolesInfo []AppRoleInfoItem `json:"roles_info"`
	}

	DefaultRolePms struct {
		db.PmsDefaultRole
	}

	CustomRolePms struct {
		db.PmsCustomRole
	}

	AppAvailableRoles struct {
		AppId   int        `json:"app_id"`
		Default []RoleItem `json:"default"` // 不允许app内修改
		Custom  []RoleItem `json:"custom"`  // 支持app内修改
	}

	ReqPermission struct {
		UserId      int      `json:"userId"`                      // request userId
		ObjectType  string   `json:"objectType" valid:"required"` // the type of ObjectIdx. its value must be a valid PermittedPrefix
		ObjectIdx   string   `json:"objectIdx"`                   // referId(e.g. aid) or other NameStr(e.g. configResourceName, url etc.)
		SubResource string   `json:"subResource"`                 // the subResource of target Object(Type+Idx). If target Obj has no subResource, please set it to "*"
		Acts        []string `json:"acts"`                        // require(or want) actions. i.e. the key of PermittedActMap
		DomainType  string   `json:"domainType"`                  // env or ent. i.e. the keys of PermittedDomPrefixMap
		DomainId    string   `json:"domainId"`                    // envId or entId based on DomainType respectively
	}

	ReqPmsCommonInfo struct {
		Iid int `json:"iid" form:"iid"` // request instance id
	}

	ResPmsCommonInfo struct {
		RulesInfo                  []InfoItem     `json:"rules_info"`
		PrefixesInfo               []InfoItem     `json:"prefixes_info"`
		AllActsInfo                []InfoItem     `json:"all_acts_info"`
		NormalActsInfo             []InfoItem     `json:"normal_acts_info"`
		AppSubResourcesInfo        []InfoItem     `json:"app_subResources_info"`
		ConfigRsrcSubResourcesInfo []InfoItem     `json:"configRsrc_subResources_info"`
		DomainCascader             []CascaderItem `json:"domainCascader"`
	}

	RootUsers struct {
		RootUids []int `json:"root_uids"`
	}

	ReqEnsureFuzzyDefaultRole struct {
		BelongType   string `json:"belong_type"`    // value in ["app", "configResource] currently
		ReferIdx     string `json:"refer_idx"`      // 所对应的belongType资源的id(如果belongTypes是"app") or name
		RoleNameLike string `json:"role_name_like"` // 角色模糊名称
		DomainType   string `json:"domain_type"`    // 角色所在domain类型 可为空
		DomainId     int    `json:"domain_id"`      // domainType不为空时, 对应的id; domainType为空时, 此处值为0
	}
)

type (
	RespDomainCascader []CascaderItem
	CascaderItem       struct {
		Value    string         `json:"value"`
		Label    string         `json:"label"`
		Children []CascaderItem `json:"children,omitempty"`
	}
)

type (
	ReqNewPmsRole struct {
		db.PmsRole
	}
	ReqUpdatePmsRole struct {
		db.PmsRole
	}
	ReqDeletePmsRole struct {
		db.PmsRole
	}
)

type (
	ReqPmsRoles struct {
		// RoleType       int    `form:"roleType"`
		Name           string `form:"name"`
		BelongResource string `form:"belongResource"`
		ResourceId     int    `form:"resourceId"` // 0: means req default pmsRoles
	}
	RoleGrantInfoFilter struct {
		ResourceType    string `form:"resourceType" valid:"required" json:"resourceType"` // app and etc.
		ResourceId      int    `form:"resourceId" valid:"required" json:"resourceId"`     // aid and etc.
		GrantObjectType string `json:"grantObjectType" form:"grantObjectType"`            // user and etc.
		DomainType      string `json:"domainType" form:"domainType"`
		DomainId        int    `json:"domainId" form:"domainId"`
		RoleType        int    `json:"roleType" form:"roleType"` // used to filter results, can be omitted
	}
)
