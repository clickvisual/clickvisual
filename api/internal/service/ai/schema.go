package ai

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func ensureAISettingSchema() error {
	if invoker.Db == nil {
		return fmt.Errorf("db is nil")
	}
	if invoker.Db.Migrator().HasTable(&dbmodel.AISetting{}) {
		return nil
	}
	return invoker.Db.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(&dbmodel.AISetting{})
}
