package init

import (
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetEgoCommandState(t *testing.T) {
	t.Helper()
	oldInitConfigFile := initConfigFile
	oldClickhouseDSN := clickhouseDSN
	oldCluster := cluster
	oldBrokers := brokers
	oldTopicsApp := topicsApp
	oldTopicsEgo := topicsEgo
	oldTopicsIngressStdout := topicsIngressStdout
	oldTopicsIngressStderr := topicsIngressStderr
	oldDryRun := dryRun
	t.Cleanup(func() {
		initConfigFile = oldInitConfigFile
		clickhouseDSN = oldClickhouseDSN
		cluster = oldCluster
		brokers = oldBrokers
		topicsApp = oldTopicsApp
		topicsEgo = oldTopicsEgo
		topicsIngressStdout = oldTopicsIngressStdout
		topicsIngressStderr = oldTopicsIngressStderr
		dryRun = oldDryRun
	})

	initConfigFile = ""
	clickhouseDSN = ""
	cluster = ""
	brokers = ""
	topicsApp = ""
	topicsEgo = ""
	topicsIngressStdout = ""
	topicsIngressStderr = ""
	dryRun = false
}

func TestClusterFlagRegistered(t *testing.T) {
	flag := CmdInit.Flags().Lookup("cluster")
	require.NotNil(t, flag)
	assert.Empty(t, flag.DefValue)
}

func TestParseConfigContentLoadsCluster(t *testing.T) {
	resetEgoCommandState(t)

	require.NoError(t, parseConfigContent("cluster = \"  shard2-repl1  \""))
	assert.Equal(t, "shard2-repl1", cluster)
}

func TestParseConfigContentPreservesCLICluster(t *testing.T) {
	resetEgoCommandState(t)
	cluster = "cli-cluster"

	require.NoError(t, parseConfigContent("cluster = \"toml-cluster\""))
	assert.Equal(t, "cli-cluster", cluster)
}

func TestClickHouseDSNIsNormalizedAndValidated(t *testing.T) {
	resetEgoCommandState(t)
	require.NoError(t, parseConfigContent("clickhouse_dsn = \"  tcp://clickhouse:9000  \""))
	assert.Equal(t, "tcp://clickhouse:9000", clickhouseDSN)

	clickhouseDSN = "   "
	assert.Empty(t, normalizeClickHouseDSN(clickhouseDSN))
	require.Error(t, validateClickHouseDSN("tcp://clickhouse:9000/%ZZ?password=secret"))
}

func TestMalformedClickHouseDSNErrorDoesNotLeakCredentials(t *testing.T) {
	dsn := "tcp://clickhouse:9000/%ZZ?username=admin&password=secret"
	err := validateClickHouseDSN(dsn)
	require.Error(t, err)
	assert.Equal(t, "ClickHouse DSN 格式无效", err.Error())
	assert.NotContains(t, err.Error(), "admin")
	assert.NotContains(t, err.Error(), "secret")
	assert.NotContains(t, err.Error(), dsn)
}

func TestDSNHelpersDoNotLeakCredentials(t *testing.T) {
	dsn := "tcp://clickhouse:9000?username=admin&password=secret"
	assert.Equal(t, "configured", clickHouseDSNLogValue(dsn))
	assert.Equal(t, "not configured", clickHouseDSNLogValue("  "))

	message := "failed to connect " + dsn
	redacted := redactSensitiveValue(message, dsn)
	assert.Equal(t, "failed to connect [REDACTED]", redacted)
	assert.NotContains(t, redacted, "admin")
	assert.NotContains(t, redacted, "secret")

	partial := redactSensitiveValue("credentials username=admin password=secret", dsn)
	assert.NotContains(t, partial, "admin")
	assert.NotContains(t, partial, "secret")
	encodedDSN := "tcp://clickhouse:9000?username=%61dmin&password=%73ecret"
	encoded := redactSensitiveValue("credentials username=%61dmin&password=%73ecret", encodedDSN)
	assert.NotContains(t, encoded, "%61dmin")
	assert.NotContains(t, encoded, "%73ecret")
}

func TestRedactSensitiveValueHandlesOverlappingCredentials(t *testing.T) {
	dsn := "tcp://admin:adminsecret@clickhouse:9000"
	message := "credentials username=admin password=adminsecret"
	redacted := redactSensitiveValue(message, dsn)
	assert.NotContains(t, redacted, "admin")
	assert.NotContains(t, redacted, "adminsecret")
	assert.NotContains(t, redacted, "secret")
}

func TestRedactSensitiveValueHandlesConvertedEncodedCredentials(t *testing.T) {
	originalDSN := "tcp://host:9000?username=%25ZZ&password=s@cret"
	message := "failed clickhouse://%ZZ:s%40cret@host:9000/default"
	redacted := redactSensitiveValue(message, originalDSN)
	assert.NotContains(t, redacted, "%ZZ")
	assert.NotContains(t, redacted, "s@cret")
	assert.NotContains(t, redacted, "s%40cret")
}

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
