package permission

import (
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/internal/service/permission"
	"github.com/shimohq/mogo/api/pkg/component/core"
)

func MenuList(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err == nil {
		c.JSONOK(service.Permission.AdminMenuList())
		return
	}
	c.JSONOK(service.Permission.UserMenuList())
	return
}
