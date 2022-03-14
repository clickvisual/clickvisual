package initialize

import (
	"fmt"

	"github.com/gotomicro/ego/core/econf"
	m "gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
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
}

// Install 根据分页获取Cluster列表
func Install(c *core.Context) {
	d, e := gorm.Open(
		m.Open(econf.GetString("mysql.default.dsn")), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true},
	)
	fmt.Println(`e--------------->`, e)
	d = d.Debug()
	d.Migrator()
	d.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(models...)
	d.Exec("INSERT INTO mogo_user (`oa_id`, `username`, `nickname`, `secret`, `email`, `avatar`, `hash`,`web_url`, `oauth`, `state`, `oauth_id`, `password`, `current_authority`, `access`, `oauth_token`, `ctime`, `utime`, `dtime`) VALUES ( 0, 'shimo', 'shimo', '', '', '', '', '', '', '', '', '$2a$10$/P5z7e4LIIES48cf/BTvROhOT1AaYU3kGw/Xw3l4nCZecIJ85N1ke', '', 'init', '{}', 1640624435, 1640624435, 0);")
	c.JSONOK("migration finish")
}

func Migration(c *core.Context) {
	d, e := gorm.Open(
		m.Open(econf.GetString("mysql.default.dsn")), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true},
	)
	fmt.Println(`e--------------->`, e)
	d = d.Debug()
	d.Migrator()
	d.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(models...)
	c.JSONOK("migration finish")
}
