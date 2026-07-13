package install

import (
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/require"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestModelsIncludesReportTables(t *testing.T) {
	t.Helper()

	want := map[reflect.Type]bool{
		reflect.TypeOf(dbmodel.Report{}):             false,
		reflect.TypeOf(dbmodel.ReportSchedule{}):     false,
		reflect.TypeOf(dbmodel.ReportExecution{}):    false,
		reflect.TypeOf(dbmodel.ReportAcceleration{}): false,
		reflect.TypeOf(dbmodel.QueryFilterProfile{}): false,
		reflect.TypeOf(dbmodel.AISetting{}):          false,
	}

	for _, model := range models {
		typ := reflect.TypeOf(model)
		if _, ok := want[typ]; ok {
			want[typ] = true
		}
	}

	for typ, found := range want {
		if !found {
			t.Fatalf("install models missing %s", typ.Name())
		}
	}
}

func TestInstallModelsDefaultToFull(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)

	if len(installModels()) != len(models) {
		t.Fatalf("installModels() length = %d, want full models length %d", len(installModels()), len(models))
	}
	assertModelSetContains(t, installModels(),
		dbmodel.Report{},
		dbmodel.Alarm{},
		dbmodel.BigdataNode{},
		dbmodel.PmsRole{},
	)
}

func TestInstallModelsPrivateLiteUsesMinimalMetadataTables(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")

	selected := installModels()
	assertModelSetContains(t, selected,
		dbmodel.User{},
		dbmodel.PmsCasbinRule{},
		dbmodel.BaseInstance{},
		dbmodel.BaseDatabase{},
		dbmodel.BaseTable{},
		dbmodel.BaseTableAttach{},
		dbmodel.BaseIndex{},
		dbmodel.BaseHiddenField{},
		dbmodel.BaseView{},
		dbmodel.BaseShortURL{},
		dbmodel.QueryFilterProfile{},
		dbmodel.QueryToken{},
		dbmodel.QueryTokenGrant{},
		dbmodel.QueryTokenAudit{},
	)
	assertModelSetNotContains(t, selected,
		dbmodel.Report{},
		dbmodel.ReportSchedule{},
		dbmodel.Alarm{},
		dbmodel.AlarmChannel{},
		dbmodel.BigdataNode{},
		dbmodel.BigdataCrontab{},
		dbmodel.Collect{},
		dbmodel.AISetting{},
		dbmodel.PmsRole{},
		dbmodel.PmsCustomRole{},
		dbmodel.PmsDefaultRole{},
	)
}

func TestMigrationSQLContainsReportTables(t *testing.T) {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve current file failed")
	}

	migrationPath := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "../../../../scripts/migration/database.sql"))
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatalf("read migration sql: %v", err)
	}

	sqlText := strings.ToLower(string(content))
	for _, tableName := range []string{
		dbmodel.TableNameReport,
		dbmodel.TableNameReportSchedule,
		dbmodel.TableNameReportExecution,
		dbmodel.TableNameReportAcceleration,
		dbmodel.TableNameQueryFilterProfile,
		dbmodel.TableNameAISetting,
	} {
		if !strings.Contains(sqlText, tableName) {
			t.Fatalf("migration sql missing table %s", tableName)
		}
	}
}

func TestPrivateLiteMigrationSupportsSQLiteMetadata(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	econf.Set("metadata.driver", "sqlite")
	econf.Set("metadata.dsn", filepath.Join(t.TempDir(), "metadata.db"))

	d, err := openInstallDB()
	require.NoError(t, err)
	require.NoError(t, migrateModels(d))
	seedRootUserAndPolicy(d)

	for _, model := range privateLiteModels {
		require.Truef(t, d.Migrator().HasTable(model), "missing table for %T", model)
	}

	var user dbmodel.User
	require.NoError(t, d.Table(dbmodel.TableNameUser).Where("id = ?", 1).First(&user).Error)
	require.Equal(t, "clickvisual", user.Username)

	var rules int64
	require.NoError(t, d.Table(dbmodel.TableNamePmsCasbinRule).Count(&rules).Error)
	require.EqualValues(t, 2, rules)
}

func TestPrivateLiteSQLiteMigrationIsIdempotent(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	econf.Set("metadata.driver", "sqlite")
	econf.Set("metadata.dsn", filepath.Join(t.TempDir(), "metadata.db"))

	d, err := openInstallDB()
	require.NoError(t, err)
	require.NoError(t, migrateModels(d))
	require.NoError(t, migrateModels(d))

	for _, model := range privateLiteModels {
		require.Truef(t, d.Migrator().HasTable(model), "missing table for %T", model)
	}
}

func assertModelSetContains(t *testing.T, selected []interface{}, want ...interface{}) {
	t.Helper()
	set := modelTypeSet(selected)
	for _, item := range want {
		typ := reflect.TypeOf(item)
		if !set[typ] {
			t.Fatalf("model set missing %s", typ.Name())
		}
	}
}

func assertModelSetNotContains(t *testing.T, selected []interface{}, unwanted ...interface{}) {
	t.Helper()
	set := modelTypeSet(selected)
	for _, item := range unwanted {
		typ := reflect.TypeOf(item)
		if set[typ] {
			t.Fatalf("model set should not include %s", typ.Name())
		}
	}
}

func modelTypeSet(selected []interface{}) map[reflect.Type]bool {
	res := make(map[reflect.Type]bool, len(selected))
	for _, item := range selected {
		res[reflect.TypeOf(item)] = true
	}
	return res
}
