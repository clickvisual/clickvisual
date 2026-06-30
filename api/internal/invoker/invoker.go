package invoker

import (
	"fmt"
	"sync"

	"github.com/ego-component/egorm"
	"github.com/ego-component/eredis"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	_ "github.com/ClickHouse/clickhouse-go/v2"
	_ "github.com/databendcloud/databend-go"

	"github.com/clickvisual/clickvisual/api/internal/pkg/session"
	"github.com/clickvisual/clickvisual/api/internal/ui"
)

var (
	Db      *egorm.Component
	Gin     *egin.Component
	Session gin.HandlerFunc
	Redis   *eredis.Component
)

var (
	metadataDBMu sync.Mutex

	requiredMetadataTables = []string{
		"cv_user",
		"cv_pms_casbin_rule",
		"cv_base_instance",
	}

	openMetadataDB = defaultOpenMetadataDB
)

// Init invoker
func Init() (err error) {
	if err = initMetadataDB(); err != nil {
		return err
	}
	Session = session.Load("auth").Build()
	Gin = egin.Load("server.http").Build(egin.WithEmbedFs(ui.WebUI))
	elog.DefaultLogger = elog.Load("logger").Build()

	if econf.GetBool("app.isMultiCopy") {
		Redis = eredis.Load("redis").Build()
	}
	return nil
}

func initMetadataDB() error {
	Db = nil
	if err := TryAttachMetadataDB(); err != nil {
		elog.Warn("metadata database is not ready, start without it", elog.FieldErr(err))
		return nil
	}
	return nil
}

func TryAttachMetadataDB() error {
	metadataDBMu.Lock()
	defer metadataDBMu.Unlock()

	if Db != nil {
		return nil
	}
	db, err := openMetadataDB()
	if err != nil {
		return err
	}
	if err = validateMetadataTables(db); err != nil {
		closeMetadataDB(db)
		return err
	}
	Db = db
	elog.Info("metadata database attached")
	return nil
}

func defaultOpenMetadataDB() (db *egorm.Component, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("open metadata database: %v", r)
			db = nil
		}
	}()
	dsn := econf.GetString("mysql.dsn")
	if dsn == "" {
		return nil, fmt.Errorf("mysql.dsn is empty")
	}
	raw, err := gorm.Open(mysql.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		return nil, err
	}
	if econf.GetBool("mysql.debug") {
		raw = raw.Debug()
	}
	sqlDB, err := raw.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(econf.GetInt("mysql.maxIdleConns"))
	sqlDB.SetMaxOpenConns(econf.GetInt("mysql.maxOpenConns"))
	if lifetime := econf.GetDuration("mysql.connMaxLifetime"); lifetime > 0 {
		sqlDB.SetConnMaxLifetime(lifetime)
	}
	if err = sqlDB.Ping(); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}
	return raw, nil
}

func validateMetadataTables(db *egorm.Component) error {
	if db == nil {
		return fmt.Errorf("metadata database is nil")
	}
	for _, table := range requiredMetadataTables {
		if !db.Migrator().HasTable(table) {
			return fmt.Errorf("metadata database table %s is not ready", table)
		}
	}
	return nil
}

func closeMetadataDB(db *egorm.Component) {
	if db == nil {
		return
	}
	sqlDB, err := db.DB()
	if err != nil {
		return
	}
	_ = sqlDB.Close()
}
