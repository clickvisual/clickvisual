package install

import (
	"fmt"

	"github.com/gotomicro/ego/core/econf"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

var models = []interface{}{
	db.View{},
	db.Table{},
	db.Index{},
	db.Database{},
	db.Instance{},
	db.User{},
	db.Cluster{},
	db.Configuration{},
	db.ConfigurationHistory{},
	db.ConfigurationPublish{},
	db.K8SConfigMap{},
	db.Event{},
	db.Alarm{},
	db.AlarmFilter{},
	db.AlarmCondition{},
	db.AlarmHistory{},
	db.AlarmChannel{},
	db.PmsRole{},
	db.PmsCustomRole{},
	db.PmsRoleRef{},
	db.PmsRoleRefGrant{},
	db.PmsDefaultRole{},
	db.PmsRoleDetail{},
	db.PmsCasbinRule{},
}

func Install() (err error) {
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
	d.Exec("INSERT INTO mogo_user (`oa_id`, `username`, `nickname`, `secret`, `email`, `avatar`, `hash`,`web_url`, `oauth`, `state`, `oauth_id`, `password`, `current_authority`, `access`, `oauth_token`, `ctime`, `utime`, `dtime`) VALUES ( 0, 'clickvisual', 'clickvisual', '', '', '', '', '', '', '', '', '$2a$10$mj/hP5ToyVYZsyH2.84sr.nXPT.c2iTenx6euMHZQhNQlGXFJlDBa', '', 'init', '{}', 1640624435, 1640624435, 0);")
	d.Exec("INSERT INTO `mogo_pms_casbin_rule` VALUES (1, 'p', 'role__root', '*', '*', '*', '', '');")
	d.Exec("INSERT INTO `mogo_pms_casbin_rule` VALUES (2, 'g3', 'user__1', 'role__root', ' ', ' ', ' ', ' ');")
	return
}

func Migration() (err error) {
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
	d.Exec("INSERT INTO `mogo_pms_casbin_rule` VALUES (1, 'p', 'role__root', '*', '*', '*', '', '');")
	d.Exec("INSERT INTO `mogo_pms_casbin_rule` VALUES (2, 'g3', 'user__1', 'role__root', ' ', ' ', ' ', ' ');")
	return
}
