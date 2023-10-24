package permission

import (
	"github.com/ego-component/egorm"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// @Tags         PREMISSION
func MenuList(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err == nil {
		c.JSONOK(service.Permission.AdminMenuList())
		return
	}
	res := make([]permission.MenuTreeItem, 0)
	ins, _ := db.InstanceList(egorm.Conds{})
	logFlag, alarmFlag, pandasFlag := false, false, false
	for _, row := range ins {
		if !logFlag && service.InstanceViewPmsWithSubResource(c.Uid(), row.ID, pmsplugin.Log) {
			logFlag = true
		}
		if !alarmFlag && service.InstanceViewPmsWithSubResource(c.Uid(), row.ID, pmsplugin.Alarm) {
			alarmFlag = true
		}
		if !pandasFlag && service.InstanceViewPmsWithSubResource(c.Uid(), row.ID, pmsplugin.Pandas) {
			pandasFlag = true
		}
	}
	for _, p := range service.Permission.AdminMenuList() {
		if logFlag && p.Name == "log" {
			res = append(res, p)
		}
		if alarmFlag && p.Name == "alarm" {
			res = append(res, p)
		}
		if pandasFlag && p.Name == "bigdata" {
			res = append(res, p)
		}
	}
	c.JSONOK(res)
}
