package permission

import (
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"
)

func MenuList(c *core.Context) {
	menuList := service.Permission.MenuList()
	c.JSONOK(menuList)
	return
}
