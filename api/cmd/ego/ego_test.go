package init

import (
	"errors"
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
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

func TestCreateLoggerDatabasePreservesClusterAndInstance(t *testing.T) {
	resetEgoCommandState(t)
	cluster = "  cluster-a  "
	instance := &db.BaseInstance{BaseModel: db.BaseModel{ID: 7}}

	oldDatabaseInfoX := databaseInfoX
	oldDatabaseDelete := databaseDelete
	oldCreateDatabase := createDatabase
	t.Cleanup(func() {
		databaseInfoX = oldDatabaseInfoX
		databaseDelete = oldDatabaseDelete
		createDatabase = oldCreateDatabase
	})

	databaseInfoX = func(_ *gorm.DB, _ map[string]interface{}) (db.BaseDatabase, error) {
		return db.BaseDatabase{}, errors.New("record not found")
	}
	databaseDelete = func(_ *gorm.DB, _ int) error {
		return nil
	}
	var captured db.BaseDatabase
	createDatabase = func(req db.BaseDatabase) (db.BaseDatabase, error) {
		captured = req
		req.ID = 42
		return req, nil
	}

	database, err := createLoggerDatabase(instance)
	require.NoError(t, err)
	assert.Equal(t, 7, captured.Iid)
	assert.Equal(t, "cluster-a", captured.Cluster)
	assert.Equal(t, 42, database.ID)
	assert.Equal(t, 7, database.Iid)
	assert.Equal(t, "logger", database.Name)
	assert.Equal(t, "cluster-a", database.Cluster)
	assert.Same(t, instance, database.Instance)
}

func TestCreateStorageByEgoTemplateReturnsErrorWhenServiceUninitialized(t *testing.T) {
	oldStorage := service.Storage
	oldCreateStorage := createStorageByEgoTemplate
	t.Cleanup(func() {
		service.Storage = oldStorage
		createStorageByEgoTemplate = oldCreateStorage
	})

	service.Storage = nil
	err := createStorageByEgoTemplate(1, db.BaseDatabase{}, view.ReqCreateStorageByTemplateEgo{})
	require.Error(t, err)
	assert.ErrorContains(t, err, "storage service 未初始化")
}

func TestCreateLoggerDatabaseRejectsInvalidInstanceBeforeLookup(t *testing.T) {
	oldDatabaseInfoX := databaseInfoX
	t.Cleanup(func() { databaseInfoX = oldDatabaseInfoX })
	lookupCalled := false
	databaseInfoX = func(_ *gorm.DB, _ map[string]interface{}) (db.BaseDatabase, error) {
		lookupCalled = true
		return db.BaseDatabase{}, nil
	}

	for name, instance := range map[string]*db.BaseInstance{
		"nil":  nil,
		"zero": &db.BaseInstance{},
	} {
		t.Run(name, func(t *testing.T) {
			lookupCalled = false
			_, err := createLoggerDatabase(instance)
			require.Error(t, err)
			assert.False(t, lookupCalled)
		})
	}
}

func TestCreateLoggerDatabaseShortCircuitsDatabaseErrors(t *testing.T) {
	t.Run("lookup error", func(t *testing.T) {
		oldInfo, oldDelete, oldCreate := databaseInfoX, databaseDelete, createDatabase
		t.Cleanup(func() {
			databaseInfoX, databaseDelete, createDatabase = oldInfo, oldDelete, oldCreate
		})
		deleteCalled, createCalled := false, false
		databaseInfoX = func(_ *gorm.DB, _ map[string]interface{}) (db.BaseDatabase, error) {
			return db.BaseDatabase{}, errors.New("lookup failed")
		}
		databaseDelete = func(_ *gorm.DB, _ int) error { deleteCalled = true; return nil }
		createDatabase = func(db.BaseDatabase) (db.BaseDatabase, error) {
			createCalled = true
			return db.BaseDatabase{}, nil
		}
		_, err := createLoggerDatabase(&db.BaseInstance{BaseModel: db.BaseModel{ID: 7}})
		require.Error(t, err)
		assert.False(t, deleteCalled)
		assert.False(t, createCalled)
	})

	t.Run("delete error", func(t *testing.T) {
		oldInfo, oldDelete, oldCreate := databaseInfoX, databaseDelete, createDatabase
		t.Cleanup(func() {
			databaseInfoX, databaseDelete, createDatabase = oldInfo, oldDelete, oldCreate
		})
		createCalled := false
		databaseInfoX = func(_ *gorm.DB, _ map[string]interface{}) (db.BaseDatabase, error) {
			return db.BaseDatabase{BaseModel: db.BaseModel{ID: 9}}, nil
		}
		databaseDelete = func(_ *gorm.DB, id int) error {
			assert.Equal(t, 9, id)
			return errors.New("delete failed")
		}
		createDatabase = func(db.BaseDatabase) (db.BaseDatabase, error) {
			createCalled = true
			return db.BaseDatabase{}, nil
		}
		_, err := createLoggerDatabase(&db.BaseInstance{BaseModel: db.BaseModel{ID: 7}})
		require.Error(t, err)
		assert.False(t, createCalled)
	})

	t.Run("create error", func(t *testing.T) {
		oldInfo, oldDelete, oldCreate := databaseInfoX, databaseDelete, createDatabase
		t.Cleanup(func() {
			databaseInfoX, databaseDelete, createDatabase = oldInfo, oldDelete, oldCreate
		})
		deleteCalled := false
		databaseInfoX = func(_ *gorm.DB, _ map[string]interface{}) (db.BaseDatabase, error) {
			return db.BaseDatabase{}, errors.New("record not found")
		}
		databaseDelete = func(_ *gorm.DB, _ int) error { deleteCalled = true; return nil }
		createDatabase = func(db.BaseDatabase) (db.BaseDatabase, error) {
			return db.BaseDatabase{}, errors.New("create failed")
		}
		_, err := createLoggerDatabase(&db.BaseInstance{BaseModel: db.BaseModel{ID: 7}})
		require.Error(t, err)
		assert.False(t, deleteCalled)
	})

	t.Run("existing database is deleted before create", func(t *testing.T) {
		oldInfo, oldDelete, oldCreate := databaseInfoX, databaseDelete, createDatabase
		t.Cleanup(func() {
			databaseInfoX, databaseDelete, createDatabase = oldInfo, oldDelete, oldCreate
		})
		calls := make([]string, 0, 2)
		databaseInfoX = func(_ *gorm.DB, _ map[string]interface{}) (db.BaseDatabase, error) {
			calls = append(calls, "lookup")
			return db.BaseDatabase{BaseModel: db.BaseModel{ID: 9}}, nil
		}
		databaseDelete = func(_ *gorm.DB, id int) error {
			calls = append(calls, "delete")
			assert.Equal(t, 9, id)
			return nil
		}
		createDatabase = func(req db.BaseDatabase) (db.BaseDatabase, error) {
			calls = append(calls, "create")
			req.ID = 42
			return req, nil
		}
		database, err := createLoggerDatabase(&db.BaseInstance{BaseModel: db.BaseModel{ID: 7}})
		require.NoError(t, err)
		assert.Equal(t, []string{"lookup", "delete", "create"}, calls)
		assert.Equal(t, 42, database.ID)
	})
}

func TestCreateEgoStorageTemplatePassesDatabaseCluster(t *testing.T) {
	resetEgoCommandState(t)
	database := db.BaseDatabase{
		BaseModel:    db.BaseModel{ID: 42},
		Iid:          7,
		Name:         "logger",
		Uid:          1,
		Cluster:      "cluster-a",
		IsCreateByCV: 1,
		Desc:         "ClickVisual 初始化创建的 logger 数据库",
		Instance:     &db.BaseInstance{BaseModel: db.BaseModel{ID: 7}},
	}

	oldCreateStorage := createStorageByEgoTemplate
	t.Cleanup(func() { createStorageByEgoTemplate = oldCreateStorage })
	var captured db.BaseDatabase
	createStorageByEgoTemplate = func(_ int, got db.BaseDatabase, _ view.ReqCreateStorageByTemplateEgo) error {
		captured = got
		return nil
	}

	require.NoError(t, createEgoStorageTemplate(database))
	assert.Equal(t, database, captured)
	assert.Same(t, database.Instance, captured.Instance)
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
	createLoggerDatabaseForEgo = func(instance *db.BaseInstance) (db.BaseDatabase, error) {
		loggerCalled = true
		return db.BaseDatabase{BaseModel: db.BaseModel{ID: 1}}, nil
	}
	createEgoStorageTemplateForEgo = func(database db.BaseDatabase) error {
		storageCalled = true
		return nil
	}

	err := initializeClickVisual()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "校验 ClickHouse cluster 失败")
	assert.False(t, loggerCalled)
	assert.False(t, storageCalled)
}

func TestCmdFuncDryRunSkipsSideEffects(t *testing.T) {
	resetEgoCommandState(t)
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	clickhouseDSN = "tcp://clickhouse:9000"
	cluster = "prod"
	dryRun = true

	var migrationCalled, serviceInitCalled, instanceCalled, clusterCalled, databaseCalled, storageCalled bool
	oldMigrate := migrateMetadataSchema
	oldInitServices := initializeEgoServicesForEgo
	oldCreateInstance := createClickHouseInstanceForEgo
	oldValidateCluster := validateClickHouseClusterForEgo
	oldCreateDatabase := createLoggerDatabaseForEgo
	oldCreateStorage := createEgoStorageTemplateForEgo
	t.Cleanup(func() {
		migrateMetadataSchema = oldMigrate
		initializeEgoServicesForEgo = oldInitServices
		createClickHouseInstanceForEgo = oldCreateInstance
		validateClickHouseClusterForEgo = oldValidateCluster
		createLoggerDatabaseForEgo = oldCreateDatabase
		createEgoStorageTemplateForEgo = oldCreateStorage
	})
	migrateMetadataSchema = func() error { migrationCalled = true; return nil }
	initializeEgoServicesForEgo = func() { serviceInitCalled = true }
	createClickHouseInstanceForEgo = func() (*db.BaseInstance, error) {
		instanceCalled = true
		return &db.BaseInstance{BaseModel: db.BaseModel{ID: 1}}, nil
	}
	validateClickHouseClusterForEgo = func(int, string) error { clusterCalled = true; return nil }
	createLoggerDatabaseForEgo = func(*db.BaseInstance) (db.BaseDatabase, error) {
		databaseCalled = true
		return db.BaseDatabase{}, nil
	}
	createEgoStorageTemplateForEgo = func(db.BaseDatabase) error { storageCalled = true; return nil }

	CmdFunc(nil, nil)

	assert.False(t, migrationCalled)
	assert.False(t, serviceInitCalled)
	assert.False(t, instanceCalled)
	assert.False(t, clusterCalled)
	assert.False(t, databaseCalled)
	assert.False(t, storageCalled)
}

func TestCmdFuncNormalModeInitializesBeforeClickVisual(t *testing.T) {
	resetEgoCommandState(t)
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	clickhouseDSN = "tcp://clickhouse:9000"
	cluster = "prod"
	dryRun = false

	var calls []string
	oldMigrate := migrateMetadataSchema
	oldInitServices := initializeEgoServicesForEgo
	oldCreateInstance := createClickHouseInstanceForEgo
	oldValidateCluster := validateClickHouseClusterForEgo
	oldCreateDatabase := createLoggerDatabaseForEgo
	oldCreateStorage := createEgoStorageTemplateForEgo
	t.Cleanup(func() {
		migrateMetadataSchema = oldMigrate
		initializeEgoServicesForEgo = oldInitServices
		createClickHouseInstanceForEgo = oldCreateInstance
		validateClickHouseClusterForEgo = oldValidateCluster
		createLoggerDatabaseForEgo = oldCreateDatabase
		createEgoStorageTemplateForEgo = oldCreateStorage
	})
	migrateMetadataSchema = func() error { calls = append(calls, "migration"); return nil }
	initializeEgoServicesForEgo = func() { calls = append(calls, "service") }
	createClickHouseInstanceForEgo = func() (*db.BaseInstance, error) {
		calls = append(calls, "instance")
		return &db.BaseInstance{BaseModel: db.BaseModel{ID: 1}}, nil
	}
	validateClickHouseClusterForEgo = func(int, string) error { calls = append(calls, "cluster"); return nil }
	createLoggerDatabaseForEgo = func(*db.BaseInstance) (db.BaseDatabase, error) {
		calls = append(calls, "database")
		return db.BaseDatabase{BaseModel: db.BaseModel{ID: 2}}, nil
	}
	createEgoStorageTemplateForEgo = func(db.BaseDatabase) error { calls = append(calls, "storage"); return nil }

	CmdFunc(nil, nil)

	assert.Equal(t, []string{"migration", "service", "instance", "cluster", "database", "storage"}, calls)
}
