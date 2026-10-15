package troubleshoot

import (
	"fmt"
	"sync"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

var (
	schemaMu    sync.Mutex
	schemaReady bool
)

func ensureSchema() error {
	if invoker.Db == nil {
		return fmt.Errorf("db is nil")
	}
	schemaMu.Lock()
	defer schemaMu.Unlock()
	if schemaReady {
		return nil
	}
	db := invoker.Db
	if db.Dialector.Name() == "mysql" {
		db = db.Set("gorm:table_options", "ENGINE=InnoDB")
	}
	if err := db.AutoMigrate(&dbmodel.TroubleshootSession{}, &dbmodel.TroubleshootMessage{}); err != nil {
		return err
	}
	schemaReady = true
	return nil
}
