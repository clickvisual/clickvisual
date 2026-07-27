package init

import (
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEnsureMetadataSchemaForEgoSkipsFullEdition(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	called := false
	old := migrateMetadataSchema
	migrateMetadataSchema = func() error {
		called = true
		return nil
	}
	t.Cleanup(func() { migrateMetadataSchema = old })

	require.NoError(t, ensureMetadataSchemaForEgo())
	assert.False(t, called)
}

func TestEnsureMetadataSchemaForEgoMigratesPrivateLiteEdition(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	called := false
	old := migrateMetadataSchema
	migrateMetadataSchema = func() error {
		called = true
		return nil
	}
	t.Cleanup(func() { migrateMetadataSchema = old })

	require.NoError(t, ensureMetadataSchemaForEgo())
	assert.True(t, called)
}
