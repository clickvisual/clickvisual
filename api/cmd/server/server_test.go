package server

import (
	"errors"
	"testing"

	"github.com/gotomicro/ego/core/econf"
)

func TestEnsureSQLiteMetadataSchemaRunsForSQLite(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("metadata.driver", "sqlite")

	called := false
	previous := ensureMetadataSchema
	ensureMetadataSchema = func() error {
		called = true
		return nil
	}
	t.Cleanup(func() {
		ensureMetadataSchema = previous
	})

	if err := ensureSQLiteMetadataSchema(); err != nil {
		t.Fatalf("ensureSQLiteMetadataSchema() error = %v", err)
	}
	if !called {
		t.Fatal("ensureMetadataSchema was not called for sqlite metadata")
	}
}

func TestEnsureSQLiteMetadataSchemaSkipsMySQL(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("metadata.driver", "mysql")

	previous := ensureMetadataSchema
	ensureMetadataSchema = func() error {
		return errors.New("should not be called")
	}
	t.Cleanup(func() {
		ensureMetadataSchema = previous
	})

	if err := ensureSQLiteMetadataSchema(); err != nil {
		t.Fatalf("ensureSQLiteMetadataSchema() error = %v", err)
	}
}
