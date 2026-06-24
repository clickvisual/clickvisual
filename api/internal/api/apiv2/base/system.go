package base

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/service/install"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
)

// SystemSchemaSync
// @Summary      手动同步系统数据结构
// @Description  复用安装迁移逻辑，同步 MySQL 元数据表结构
// @Tags         BASE
// @Produce      json
// @Router       /api/v2/base/system/schema-sync [post]
func SystemSchemaSync(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if err := install.Migration(); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK("migration finish")
}
