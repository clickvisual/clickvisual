package config

import (
	"path/filepath"
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetadataConfigDefaultsToMySQL(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("mysql.dsn", "root:test@tcp(127.0.0.1:3306)/clickvisual")

	assert.Equal(t, MetadataDriverMySQL, MetadataDriver())
	assert.Equal(t, "root:test@tcp(127.0.0.1:3306)/clickvisual", MetadataDSN())
	assert.Equal(t, "ENGINE=InnoDB", MetadataTableOptions())
}

func TestMetadataConfigUsesExplicitSQLite(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	dsn := filepath.Join(t.TempDir(), "metadata.db")
	econf.Set("metadata.driver", "sqlite")
	econf.Set("metadata.dsn", dsn)

	assert.Equal(t, MetadataDriverSQLite, MetadataDriver())
	assert.Equal(t, dsn, MetadataDSN())
	assert.Equal(t, "", MetadataTableOptions())

	db, err := OpenMetadataDB(nil)
	require.NoError(t, err)
	require.NoError(t, ConfigureMetadataSQLDB(db))
}
