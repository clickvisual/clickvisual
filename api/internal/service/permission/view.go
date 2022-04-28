package permission

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

type (
	ReqLockDomain struct {
		TgtDomainType PmsDomainType4Lock `json:"tgtDomainType" validate:"required" form:"tgtDomainType"` // 目标Domain实体类型
		TgtDomainId   int                `json:"tgtDomainId" form:"tgtDomainId"`                         // 目标Domain实体的id, 注: 当TgtDomainType为 "system" 时, 将忽略该字段
	}
	ReqUnlockDomain      ReqLockDomain
	ReqDomainLockStatus  ReqLockDomain
	RespDomainLockStatus struct {
		TgtDomainType  PmsDomainType4Lock `json:"tgtDomainType"` // 目标Domain实体类型
		TgtDomainId    int                `json:"tgtDomainId"`   // 目标Domain实体的id, 注: 当TgtDomainType为 "system" 时, 将忽略该字段
		TgtDomainName  string             `json:"tgtDomainName"` // 目标Domain实体的名称
		Locked         bool               `json:"locked"`        // 当前是否被锁定
		LockByUid      int                `json:"lockByUid"`
		LockByUsername string             `json:"lockByUsername"`
	}
	DomainLockOrUnlockEventMetadata struct {
		TgtDomainType       PmsDomainType4Lock `json:"tgtDomainType"`
		TgtDomainId         int                `json:"tgtDomainId,omitempty"`
		TgtDomainNameDetail string             `json:"tgtDomainNameDetail"` // 目标Domain对象的详尽名称
		PerformedOperation  string             `json:"performedOperation"`
	}
)

type (
	MenuTreeItem struct {
		Name     string         `yaml:"name" json:"name"`
		Path     string         `yaml:"path" json:"path"`
		Icon     string         `yaml:"icon" json:"icon"`
		Children []MenuTreeItem `yaml:"children" json:"children,omitempty"`
	}

	Resource struct {
		Permission []MenuTreeItem
	}
)

type (
	PmsRoleDetail struct {
		SubResources []string `json:"sub_resources"`
		Acts         []string `json:"acts"`
	}
	Domain4Fe                []string
	InstancePmsRoleGrantItem struct {
		Created int       `json:"created"`
		Domain  Domain4Fe `json:"domain"`
		UserIds []int     `json:"userIds"`
	}
	InstancePmsRole struct {
		Id       int                         `json:"id"`
		RoleType int                         `json:"roleType"`
		Name     string                      `json:"name"`
		Desc     string                      `json:"desc"`
		Details  []PmsRoleDetail             `json:"details"`
		Grant    []*InstancePmsRoleGrantItem `json:"grant"`
	}

	InstancePmsRolesWithGrantInfo struct {
		Iid   int                `json:"iid"`
		Roles []*InstancePmsRole `json:"roles"`
	}
)

func (df *Domain4Fe) ToString() string {
	return strings.Join(*df, "__")
}

func (df Domain4Fe) GetDomainTypeAndId() (domType string, domId int, err error) {
	invalidErr := fmt.Errorf("invalid domain4Fe. ")
	switch len(df) {
	case 1:
		if df[0] == pmsplugin.AllDom {
			return "", 0, nil
		}
		err = invalidErr
		return
	case 2:
		if df[0] != pmsplugin.PrefixDatabase {
			err = invalidErr
			return
		}
		domType = df[0]
		domId, err = strconv.Atoi(df[1])
		return
	case 3:
		if df[0] != pmsplugin.PrefixTable {
			err = invalidErr
			return
		}
		domType = df[0]
		domId, err = strconv.Atoi(df[2])
		return
	default:
		err = invalidErr
		return
	}
}

func Trans2Domain4Fe(domType string, domId int) Domain4Fe {
	switch strings.TrimSpace(domType) {
	case "", "*":
		return []string{pmsplugin.AllDom}
	case pmsplugin.PrefixDatabase:
		return []string{pmsplugin.PrefixDatabase, strconv.Itoa(domId)}
	case pmsplugin.PrefixTable:
		table, err := db.TableInfo(invoker.Db, domId)
		if err != nil {
			return []string{}
		}
		return []string{pmsplugin.PrefixTable, strconv.Itoa(table.Database.ID), strconv.Itoa(domId)}

	default:
		return []string{}
	}
}
