package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/glebarez/sqlite"
	"github.com/gotomicro/ego/core/econf"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	MetadataDriverMySQL  = "mysql"
	MetadataDriverSQLite = "sqlite"
)

func MetadataDriver() string {
	driver := strings.ToLower(strings.TrimSpace(econf.GetString("metadata.driver")))
	if driver == "" {
		return MetadataDriverMySQL
	}
	return driver
}

func MetadataDSN() string {
	if dsn := econf.GetString("metadata.dsn"); strings.TrimSpace(dsn) != "" {
		return dsn
	}
	return econf.GetString("mysql.dsn")
}

func OpenMetadataDB(gormConfig *gorm.Config) (*gorm.DB, error) {
	dsn := MetadataDSN()
	if strings.TrimSpace(dsn) == "" {
		return nil, fmt.Errorf("metadata.dsn is empty")
	}
	if gormConfig == nil {
		gormConfig = &gorm.Config{Logger: logger.Discard}
	}
	switch MetadataDriver() {
	case MetadataDriverMySQL:
		return gorm.Open(mysql.Open(dsn), gormConfig)
	case MetadataDriverSQLite:
		if err := ensureSQLiteDir(dsn); err != nil {
			return nil, err
		}
		return gorm.Open(sqlite.Open(dsn), gormConfig)
	default:
		return nil, fmt.Errorf("unsupported metadata.driver %q", MetadataDriver())
	}
}

func ConfigureMetadataSQLDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	if MetadataDriver() == MetadataDriverSQLite {
		sqlDB.SetMaxIdleConns(2)
		sqlDB.SetMaxOpenConns(5)
		return nil
	}
	sqlDB.SetMaxIdleConns(econf.GetInt("mysql.maxIdleConns"))
	sqlDB.SetMaxOpenConns(econf.GetInt("mysql.maxOpenConns"))
	if lifetime := econf.GetDuration("mysql.connMaxLifetime"); lifetime > 0 {
		sqlDB.SetConnMaxLifetime(lifetime)
	}
	return nil
}

func MetadataDebug() bool {
	if econf.GetString("metadata.debug") != "" {
		return econf.GetBool("metadata.debug")
	}
	return econf.GetBool("mysql.debug")
}

func MetadataTableOptions() string {
	if MetadataDriver() == MetadataDriverMySQL {
		return "ENGINE=InnoDB"
	}
	return ""
}

func ensureSQLiteDir(dsn string) error {
	if dsn == ":memory:" || strings.HasPrefix(dsn, "file:") {
		return nil
	}
	dir := filepath.Dir(dsn)
	if dir == "." || dir == "" {
		return nil
	}
	return os.MkdirAll(dir, 0o755)
}
