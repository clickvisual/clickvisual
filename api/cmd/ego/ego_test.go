package init

import (
	"errors"
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
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

func TestValidateClickHouseClusterSkipsLoaderForEmptyCluster(t *testing.T) {
	called := false
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		called = true
		return nil, nil
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	require.NoError(t, validateClickHouseCluster(1, "  "))
	assert.False(t, called)
}

func TestValidateClickHouseClusterAllowsMultipleShards(t *testing.T) {
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		return map[string]dto.ClusterInfo{"prod": {Name: "prod", MaxShardNum: 2, MaxReplicaNum: 1}}, nil
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	require.NoError(t, validateClickHouseCluster(1, " prod "))
}

func TestValidateClickHouseClusterAllowsMultipleReplicas(t *testing.T) {
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		return map[string]dto.ClusterInfo{"prod": {Name: "prod", MaxShardNum: 1, MaxReplicaNum: 2}}, nil
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	require.NoError(t, validateClickHouseCluster(1, "prod"))
}

func TestValidateClickHouseClusterRejectsUnknownClusterWithAvailableMultiNodeNames(t *testing.T) {
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		return map[string]dto.ClusterInfo{
			"zeta":  {Name: "zeta", MaxShardNum: 1, MaxReplicaNum: 3},
			"alpha": {Name: "alpha", MaxShardNum: 2, MaxReplicaNum: 1},
			"solo":  {Name: "solo", MaxShardNum: 1, MaxReplicaNum: 1},
		}, nil
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	err := validateClickHouseCluster(1, "missing")
	require.Error(t, err)
	assert.Contains(t, err.Error(), `ClickHouse cluster "missing" 不存在`)
	assert.Contains(t, err.Error(), "alpha, zeta")
	assert.NotContains(t, err.Error(), "solo")
}

func TestValidateClickHouseClusterUnknownClusterReportsNoAvailableMultiNodeNames(t *testing.T) {
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		return map[string]dto.ClusterInfo{"solo": {Name: "solo", MaxShardNum: 1, MaxReplicaNum: 1}}, nil
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	err := validateClickHouseCluster(1, "missing")
	require.Error(t, err)
	assert.Contains(t, err.Error(), `ClickHouse cluster "missing" 不存在`)
	assert.Contains(t, err.Error(), "可用多节点 cluster: 无")
}

func TestValidateClickHouseClusterRejectsSingleNodeCluster(t *testing.T) {
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		return map[string]dto.ClusterInfo{"solo": {Name: "solo", MaxShardNum: 1, MaxReplicaNum: 1}}, nil
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	err := validateClickHouseCluster(1, "solo")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "1 shard × 1 replica")
	assert.Contains(t, err.Error(), "移除 cluster 配置使用单机模式")
}

func TestValidateClickHouseClusterWrapsLoaderError(t *testing.T) {
	old := loadClickHouseClusterInfo
	loadClickHouseClusterInfo = func(instanceID int) (map[string]dto.ClusterInfo, error) {
		return nil, errors.New("system.clusters unavailable")
	}
	t.Cleanup(func() { loadClickHouseClusterInfo = old })

	err := validateClickHouseCluster(1, "prod")
	require.Error(t, err)
	assert.ErrorContains(t, err, "查询 ClickHouse system.clusters 失败")
	assert.ErrorContains(t, err, "system.clusters unavailable")
}

func TestInitializeClickVisualStopsBeforeLoggerDatabaseWhenClusterValidationFails(t *testing.T) {
	oldCreateInstance := createClickHouseInstanceForEgo
	oldValidateCluster := validateClickHouseClusterForEgo
	oldCreateDatabase := createLoggerDatabaseForEgo
	oldCreateStorage := createEgoStorageTemplateForEgo
	t.Cleanup(func() {
		createClickHouseInstanceForEgo = oldCreateInstance
		validateClickHouseClusterForEgo = oldValidateCluster
		createLoggerDatabaseForEgo = oldCreateDatabase
		createEgoStorageTemplateForEgo = oldCreateStorage
	})

	loggerCalled := false
	storageCalled := false
	createClickHouseInstanceForEgo = func() (*db.BaseInstance, error) {
		return &db.BaseInstance{BaseModel: db.BaseModel{ID: 7}}, nil
	}
	validateClickHouseClusterForEgo = func(instanceID int, clusterName string) error {
		return errors.New("cluster topology invalid")
	}
	createLoggerDatabaseForEgo = func(instanceID int) (int, error) {
		loggerCalled = true
		return 1, nil
	}
	createEgoStorageTemplateForEgo = func(databaseID int, instance *db.BaseInstance) error {
		storageCalled = true
		return nil
	}

	err := initializeClickVisual()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "校验 ClickHouse cluster 失败")
	assert.False(t, loggerCalled)
	assert.False(t, storageCalled)
}
