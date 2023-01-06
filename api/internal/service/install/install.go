package install

import (
	"fmt"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
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

	// v2 -> v3 upgrade
	var ot string
	_ = d.Raw("SHOW TABLES LIKE 'mogo_user';").Row().Scan(&ot)
	if ot == "mogo_user" {
		// rename
		d.Exec("rename table mogo_alarm to cv_alarm;")
		d.Exec("rename table mogo_user to cv_user;")
		d.Exec("rename table mogo_event to cv_event;")
		d.Exec("rename table mogo_k8s_cm to cv_k8s_cm;")
		d.Exec("rename table mogo_cluster to cv_cluster;")
		d.Exec("rename table mogo_base_view to cv_base_view;")
		d.Exec("rename table mogo_base_table to cv_base_table;")
		d.Exec("rename table mogo_base_index to cv_base_index;")
		d.Exec("rename table mogo_alarm_filter to cv_alarm_filter;")
		d.Exec("rename table mogo_base_database to cv_base_database;")
		d.Exec("rename table mogo_base_instance to cv_base_instance;")
		d.Exec("rename table mogo_configuration to cv_configuration;")
		d.Exec("rename table mogo_alarm_history to cv_alarm_history;")
		d.Exec("rename table mogo_alarm_channel to cv_alarm_channel;")
		d.Exec("rename table mogo_alarm_condition to cv_alarm_condition;")
		d.Exec("rename table mogo_configuration_history to cv_configuration_history;")
		d.Exec("rename table mogo_configuration_publish to cv_configuration_publish;")
		d.Exec("rename table mogo_pms_role to cv_pms_role;")
		d.Exec("rename table mogo_pms_role_detail to cv_pms_role_detail;")
		d.Exec("rename table mogo_pms_role_ref to cv_pms_role_ref;")
		d.Exec("rename table mogo_pms_role_ref_grant to cv_pms_role_ref_grant;")
		d.Exec("rename table mogo_pms_casbin_rule to cv_pms_casbin_rule;")
		d.Exec("rename table mogo_pms_default_role to cv_pms_default_role;")
		d.Exec("rename table mogo_pms_custom_role to cv_pms_custom_role;")
	}
	elog.Debug("install", elog.Any("tables", ot))

	fmt.Println(`e--------------->`, err)
	d = d.Debug()
	d.Migrator()
	err = d.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(models...)
	if err != nil {
		return
	}

	d.Exec("INSERT INTO cv_user (`oa_id`, `username`, `nickname`, `secret`, `email`, `avatar`, `hash`,`web_url`, `oauth`, `state`, `oauth_id`, `password`, `current_authority`, `access`, `oauth_token`, `ctime`, `utime`, `dtime`) VALUES ( 0, 'clickvisual', 'clickvisual', '', '', '', '', '', '', '', '', '$2a$10$mj/hP5ToyVYZsyH2.84sr.nXPT.c2iTenx6euMHZQhNQlGXFJlDBa', '', 'init', '{}', 1640624435, 1640624435, 0);")
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
