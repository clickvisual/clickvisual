package install

import (
	"fmt"

	"github.com/gotomicro/ego/core/econf"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

var models = []interface{}{
	db2.BaseTableAttach{},
	db2.BaseInstance{},
	db2.BigdataCrontab{},
	db2.AlarmFilter{},
	db2.AlarmHistory{},

	db2.Collect{},

	db2.BigdataWorkflow{},
	db2.BigdataSource{},
	db2.BigdataFolder{},
	db2.BigdataNode{},
	db2.BigdataNodeContent{},
	db2.BigdataNodeHistory{},
	db2.BigdataNodeResult{},
	db2.BigdataDepend{},

	db2.BaseView{},
	db2.BaseTable{},
	db2.BaseIndex{},
	db2.BaseShortURL{},
	db2.BaseDatabase{},
	db2.BaseHiddenField{},

	db2.Alarm{},
	db2.AlarmCondition{},
	db2.AlarmChannel{},

	db2.User{},
	db2.Event{},
	db2.Cluster{},
	db2.K8SConfigMap{},

	db2.Configuration{},
	db2.ConfigurationHistory{},
	db2.ConfigurationPublish{},

	db2.PmsRole{},
	db2.PmsCustomRole{},
	db2.PmsRoleRef{},
	db2.PmsRoleRefGrant{},
	db2.PmsDefaultRole{},
	db2.PmsRoleDetail{},
	db2.PmsCasbinRule{},
}

func Install() (err error) {
	d, err := gorm.Open(
		mysql.Open(econf.GetString("mysql.dsn")), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true},
	)
	if err != nil {
		return
	}
	d = d.Debug()
	d.Migrator()
	err = d.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(models...)
	if err != nil {
		return
	}

	d.Exec("INSERT INTO cv_user (`id`, `oa_id`, `username`, `nickname`, `secret`, `phone`,`email`, `avatar`, `hash`,`web_url`, `oauth`, `state`, `oauth_id`, `password`, `current_authority`, `access`, `oauth_token`, `ctime`, `utime`, `dtime`) VALUES (1, 0, 'clickvisual', 'clickvisual', '', '', '', '', '', '', '', '', '', '$2a$10$mj/hP5ToyVYZsyH2.84sr.nXPT.c2iTenx6euMHZQhNQlGXFJlDBa', '', 'init', '{}', 1640624435, 1640624435, 0);")
	d.Exec("INSERT INTO `cv_pms_casbin_rule` VALUES (1, 'p', 'role__root', '*', '*', '*', '', '', '','');")
	d.Exec("INSERT INTO `cv_pms_casbin_rule` VALUES (2, 'g3', 'user__1', 'role__root', '', '', '', '', '', '');")
	pmsplugin.EnforcerLoadPolicy()
	return
}

func Migration() (err error) {
	// table deps update
	d, e := gorm.Open(
		mysql.Open(econf.GetString("mysql.dsn")), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true},
	)
	fmt.Println(`e--------------->`, e)
	d = d.Debug()
	d.Migrator()
	err = d.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(models...)
	if err != nil {
		return
	}
	d.Exec("INSERT INTO `cv_pms_casbin_rule` VALUES (1, 'p', 'role__root', '*', '*', '*', '', '', '','');")
	d.Exec("INSERT INTO `cv_pms_casbin_rule` VALUES (2, 'g3', 'user__1', 'role__root', '', '', '', '', '', '');")
	pmsplugin.EnforcerLoadPolicy()
	return
}
