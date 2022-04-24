package initialize

import (
	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/install"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

// IsInstall Determine whether the installation process is required
func IsInstall(c *core.Context) {
	var u db.User
	err := invoker.Db.Table(db.TableNameUser).Select("id, username").Limit(1).First(&u).Error
	if err != nil {
		c.JSONOK(0)
		return
	}
	if u.ID == 0 {
		c.JSONOK(0)
		return
	}
	c.JSONOK(1)
}

// Install Perform the installation process
func Install(c *core.Context) {
	err := install.Install()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK("install finish")
}

func Migration(c *core.Context) {
	err := install.Migration()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK("migration finish")
}
