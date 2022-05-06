package permission

import (
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

func MenuList(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err == nil {
		c.JSONOK(service.Permission.AdminMenuList())
		return
	}
	c.JSONOK(service.Permission.UserMenuList())
	return
}
