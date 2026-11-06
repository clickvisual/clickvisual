package ai

import (
	"fmt"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func useSQLiteDB(t *testing.T) {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	d, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	prevDB := invoker.Db
	invoker.Db = d
	schemaReady = false
	t.Cleanup(func() {
		invoker.Db = prevDB
		schemaReady = false
	})
	require.NoError(t, ensureAISettingSchema())
}

func TestProvidersImportLegacySettingOnce(t *testing.T) {
	useSQLiteDB(t)
	require.NoError(t, dbmodel.AISettingCreate(invoker.Db, &dbmodel.AISetting{
		Enabled:         1,
		BaseURL:         "https://gateway.example.com/v1",
		Model:           "gpt-legacy",
		APIKeyEncrypted: dbmodel.EncryptAIKey("sk-legacy-123456"),
	}))

	resp, err := ListProviders()
	require.NoError(t, err)
	require.Len(t, resp.Providers, 1)
	legacy := resp.Providers[0]
	require.Equal(t, legacyProviderKey, legacy.ID)
	require.Equal(t, "gpt-legacy", legacy.Model)
	require.True(t, legacy.Enabled)
	require.True(t, legacy.KeySet)
	require.Equal(t, "3456", legacy.KeyHint)
	require.Equal(t, []string{legacyProviderKey}, resp.Chain)

	resp, err = SaveProviders(7, view.ReqSaveAIProviders{Providers: []view.AIProviderItem{
		{ID: "claude", Name: "Claude", Kind: "anthropic", BaseURL: "https://api.anthropic.com", Model: "claude-x", APIKey: "sk-ant-abcdefgh", Enabled: true},
		{ID: legacyProviderKey, Name: legacy.Name, Kind: legacy.Kind, BaseURL: legacy.BaseURL, Model: legacy.Model, Enabled: false},
	}})
	require.NoError(t, err)
	require.Equal(t, []string{"claude", legacyProviderKey}, []string{resp.Providers[0].ID, resp.Providers[1].ID})
	require.True(t, resp.Providers[1].KeySet, "blank api key must keep the stored key")
	require.Equal(t, []string{"claude"}, resp.Chain)

	_, err = SaveProviders(7, view.ReqSaveAIProviders{})
	require.NoError(t, err)
	resp, err = ListProviders()
	require.NoError(t, err)
	require.Empty(t, resp.Providers, "legacy model must not come back after the list is cleared")

	_, _, err = loadRuntime()
	require.Error(t, err)
}

func TestSaveProvidersRejectsDuplicateIDs(t *testing.T) {
	useSQLiteDB(t)
	item := view.AIProviderItem{ID: "grok", Kind: "openai", BaseURL: "https://api.x.ai", Model: "grok-4", APIKey: "sk-test"}
	_, err := SaveProviders(1, view.ReqSaveAIProviders{Providers: []view.AIProviderItem{item, item}})
	require.ErrorContains(t, err, "重复")
}

func TestFreshBackendCanConfigureFirstModel(t *testing.T) {
	useSQLiteDB(t)
	providers, err := ListProviders()
	require.NoError(t, err)
	require.Empty(t, providers.Providers)
	_, err = UpdateSetting(1, view.ReqUpdateAISetting{Enabled: true, TimeoutSeconds: 120})
	require.NoError(t, err)
	providers, err = SaveProviders(1, view.ReqSaveAIProviders{Providers: []view.AIProviderItem{{
		ID: "grok", Kind: ProviderKindOpenAIResponses, BaseURL: "https://gateway.example/v1", Model: "grok-test", APIKey: "test-key", Enabled: true,
	}}})
	require.NoError(t, err)
	require.True(t, providers.Providers[0].KeySet)
	_, chain, err := loadRuntime()
	require.NoError(t, err)
	require.Equal(t, ProviderKindOpenAIResponses, chain[0].Kind)
}
