package install

import (
	"fmt"

	"github.com/gotomicro/ego/core/econf"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

var models = []interface{}{
	db.BaseTableAttach{},
	db.BaseInstance{},
	db.BigdataCrontab{},
	db.AlarmFilter{},
	db.AlarmHistory{},

	db.Collect{},

	db.BigdataWorkflow{},
	db.BigdataSource{},
	db.BigdataFolder{},
	db.BigdataNode{},
	db.BigdataNodeContent{},
	db.BigdataNodeHistory{},
	db.BigdataNodeResult{},
	db.BigdataDepend{},

	db.BaseView{},
	db.BaseTable{},
	db.BaseIndex{},
	db.BaseShortURL{},
	db.BaseDatabase{},
	db.BaseHiddenField{},

	db.Alarm{},
	db.AlarmCondition{},
	db.AlarmChannel{},

	db.User{},
	db.Event{},
	db.Cluster{},
	db.K8SConfigMap{},

	db.Configuration{},
	db.ConfigurationHistory{},
	db.ConfigurationPublish{},

	db.PmsRole{},
	db.PmsCustomRole{},
	db.PmsRoleRef{},
	db.PmsRoleRefGrant{},
	db.PmsDefaultRole{},
	db.PmsRoleDetail{},
	db.PmsCasbinRule{},
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

	d.Exec("INSERT INTO cv_user (`oa_id`, `username`, `nickname`, `secret`, `phone`,`email`, `avatar`, `hash`,`web_url`, `oauth`, `state`, `oauth_id`, `password`, `current_authority`, `access`, `oauth_token`, `ctime`, `utime`, `dtime`) VALUES ( 0, 'clickvisual', 'clickvisual', '', '', '', '', '', '', '', '', '', '$2a$10$mj/hP5ToyVYZsyH2.84sr.nXPT.c2iTenx6euMHZQhNQlGXFJlDBa', '', 'init', '{}', 1640624435, 1640624435, 0);")
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
