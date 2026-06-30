package invoker

import (
	"errors"
	"testing"

	"github.com/ego-component/egorm"
	"github.com/glebarez/sqlite"
	"github.com/gotomicro/ego/core/econf"
	"gorm.io/gorm"
)

func TestInitMetadataDBFallsBackWhenOpenFails(t *testing.T) {
	econf.Reset()
	Db = nil
	oldOpen := openMetadataDB
	openMetadataDB = func() (*egorm.Component, error) {
		return nil, errors.New("not ready")
	}
	defer func() {
		openMetadataDB = oldOpen
	}()

	if err := initMetadataDB(); err != nil {
		t.Fatalf("initMetadataDB() error = %v", err)
	}
	if Db != nil {
		t.Fatalf("Db = %v, want nil when metadata DB is not ready", Db)
	}
}

func TestTryAttachMetadataDBWaitsForRequiredTables(t *testing.T) {
	econf.Reset()
	Db = nil
	dsn := t.TempDir() + "/metadata.db"
	d, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	oldOpen := openMetadataDB
	openMetadataDB = func() (*egorm.Component, error) {
		return gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	}
	defer func() {
		openMetadataDB = oldOpen
		Db = nil
	}()

	if err = TryAttachMetadataDB(); err == nil {
		t.Fatal("TryAttachMetadataDB() error = nil, want missing table error")
	}
	if Db != nil {
		t.Fatalf("Db = %v, want nil while required tables are missing", Db)
	}

	for _, table := range requiredMetadataTables {
		if err = d.Exec("CREATE TABLE " + table + " (id integer primary key)").Error; err != nil {
			t.Fatalf("create table %s: %v", table, err)
		}
	}
	if err = TryAttachMetadataDB(); err != nil {
		t.Fatalf("TryAttachMetadataDB() error = %v", err)
	}
	if Db == nil {
		t.Fatal("Db is nil, want attached DB")
	}
}

func TestTryAttachMetadataDBKeepsNilWhenOpenFails(t *testing.T) {
	econf.Reset()
	Db = nil
	oldOpen := openMetadataDB
	openMetadataDB = func() (*egorm.Component, error) {
		return nil, errors.New("not ready")
	}
	defer func() {
		openMetadataDB = oldOpen
	}()

	if err := TryAttachMetadataDB(); err == nil {
		t.Fatal("TryAttachMetadataDB() error = nil, want open error")
	}
	if Db != nil {
		t.Fatalf("Db = %v, want nil after open failure", Db)
	}
}
