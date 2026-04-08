package install

import (
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestModelsIncludesReportTables(t *testing.T) {
	t.Helper()

	want := map[reflect.Type]bool{
		reflect.TypeOf(dbmodel.Report{}):             false,
		reflect.TypeOf(dbmodel.ReportSchedule{}):     false,
		reflect.TypeOf(dbmodel.ReportExecution{}):    false,
		reflect.TypeOf(dbmodel.ReportAcceleration{}): false,
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
	} {
		if !strings.Contains(sqlText, tableName) {
			t.Fatalf("migration sql missing table %s", tableName)
		}
	}
}
