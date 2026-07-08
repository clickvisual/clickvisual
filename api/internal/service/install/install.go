package install

import (
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	appconfig "github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
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
	db.Report{},
	db.ReportSchedule{},
	db.ReportExecution{},
	db.ReportAcceleration{},
	db.QueryFilterProfile{},
	db.AISetting{},
	db.QueryToken{},
	db.QueryTokenGrant{},
	db.QueryTokenAudit{},

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

var privateLiteModels = []interface{}{
	db.BaseTableAttach{},
	db.BaseInstance{},
	db.BaseDatabase{},
	db.BaseTable{},
	db.BaseIndex{},
	db.BaseHiddenField{},
	db.BaseView{},

	db.QueryFilterProfile{},
	db.QueryToken{},
	db.QueryTokenGrant{},
	db.QueryTokenAudit{},

	db.User{},
	db.PmsCasbinRule{},
}

func installModels() []interface{} {
	if appconfig.IsPrivateLiteMode() {
		return privateLiteModels
	}
	return models
}

func Install() (err error) {
	d, err := openInstallDB()
	if err != nil {
		return
	}
	d.Migrator()
	err = migrateModels(d)
	if err != nil {
		return
	}

	seedRootUserAndPolicy(d)
	pmsplugin.EnforcerLoadPolicy()
	return
}

func Migration() (err error) {
	// table deps update
	d, e := openInstallDB()
	fmt.Println(`e--------------->`, e)
	if e != nil {
		return e
	}
	d.Migrator()
	err = migrateModels(d)
	if err != nil {
		return
	}
	seedRootUserAndPolicy(d)
	pmsplugin.EnforcerLoadPolicy()
	return
}

func openInstallDB() (*gorm.DB, error) {
	d, err := appconfig.OpenMetadataDB(&gorm.Config{DisableForeignKeyConstraintWhenMigrating: true})
	if err != nil {
		return nil, err
	}
	if appconfig.MetadataDebug() {
		d = d.Debug()
	}
	if err = appconfig.ConfigureMetadataSQLDB(d); err != nil {
		return nil, err
	}
	return d, nil
}

func migrateModels(d *gorm.DB) error {
	if appconfig.MetadataDriver() == appconfig.MetadataDriverSQLite {
		for _, model := range installModels() {
			if d.Migrator().HasTable(model) {
				continue
			}
			if err := d.Migrator().CreateTable(model); err != nil {
				return err
			}
		}
		return nil
	}
	if tableOptions := appconfig.MetadataTableOptions(); tableOptions != "" {
		return d.Set("gorm:table_options", tableOptions).AutoMigrate(installModels()...)
	}
	return d.AutoMigrate(installModels()...)
}

func seedRootUserAndPolicy(d *gorm.DB) {
	d.Clauses(clause.OnConflict{DoNothing: true}).Create(&db.User{
		BaseModel:        db.BaseModel{ID: 1, Ctime: 1640624435, Utime: 1640624435},
		OaId:             0,
		Username:         "clickvisual",
		Nickname:         "clickvisual",
		Password:         "$2a$10$mj/hP5ToyVYZsyH2.84sr.nXPT.c2iTenx6euMHZQhNQlGXFJlDBa",
		CurrentAuthority: "",
		Access:           "init",
	})
	d.Clauses(clause.OnConflict{DoNothing: true}).Create(&[]db.PmsCasbinRule{
		{Id: 1, Ptype: "p", V0: "role__root", V1: "*", V2: "*", V3: "*", V4: "", V5: "", V6: "", V7: ""},
		{Id: 2, Ptype: "g3", V0: "user__1", V1: "role__root", V2: "", V3: "", V4: "", V5: "", V6: "", V7: ""},
	})
}
