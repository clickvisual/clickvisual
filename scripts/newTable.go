package main

import (
	"fmt"

	m "gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/pkg/model/db"
)

var (
	database = "mogo"
	mysql    = "root:123456@tcp(127.0.0.1:3306)"
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

func main() {
	d, e := gorm.Open(
		m.Open(fmt.Sprintf("%s/%s?charset=utf8&parseTime=True&loc=Local", mysql, database)), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true},
	)
	fmt.Println(`e--------------->`, e)
	d = d.Debug()
	d.Migrator()
	d.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(models...)
}
