package base

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestLogLibraryManagementTableColumnsInvalidParameters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/log-library-management/instances/:iid/databases/:database/tables/:table/columns", core.Handle(LogLibraryManagementTableColumns))
	req := httptest.NewRequest("GET", "/log-library-management/instances/0/databases/db/tables/t/columns", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != 200 {
		t.Fatalf("expected HTTP 200, got %d", resp.Code)
	}
	if got := resp.Body.String(); got == "" || got[0] != '{' {
		t.Fatalf("expected JSON error response, got %q", got)
	}
}

func TestLogLibraryPhysicalTableRefsIncludeAllStandaloneTables(t *testing.T) {
	refs, err := logLibraryPhysicalTableRefs(db.BaseTable{
		Name:      "test",
		SqlData:   "CREATE TABLE IF NOT EXISTS `cv_logs`.`test` (x String)",
		SqlStream: "CREATE TABLE IF NOT EXISTS `cv_logs`.`test_stream` (x String) ENGINE = Kafka",
		SqlView:   "CREATE MATERIALIZED VIEW IF NOT EXISTS `cv_logs`.`test_view` TO `cv_logs`.`test` AS SELECT x FROM `cv_logs`.`test_stream`",
	}, "cv_logs", "test")
	if err != nil {
		t.Fatalf("logLibraryPhysicalTableRefs() error = %v", err)
	}
	if len(refs) != 3 {
		t.Fatalf("expected 3 physical tables, got %d: %#v", len(refs), refs)
	}
	if refs[0].Name != "cv_logs.test" || refs[1].Name != "cv_logs.test_stream" || refs[2].Name != "cv_logs.test_view" {
		t.Fatalf("unexpected physical table order: %#v", refs)
	}
}

func TestLogLibraryPhysicalTableRefsIncludeDistributedTable(t *testing.T) {
	refs, err := logLibraryPhysicalTableRefs(db.BaseTable{
		Name:           "test",
		SqlData:        "CREATE TABLE IF NOT EXISTS `cv_logs`.`test_local` ON CLUSTER 'logs' (x String)",
		SqlStream:      "CREATE TABLE IF NOT EXISTS `cv_logs`.`test_stream` ON CLUSTER 'logs' (x String) ENGINE = Kafka",
		SqlView:        "CREATE MATERIALIZED VIEW IF NOT EXISTS `cv_logs`.`test_view` ON CLUSTER 'logs' TO `cv_logs`.`test_local` AS SELECT x FROM `cv_logs`.`test_stream`",
		SqlDistributed: "CREATE TABLE IF NOT EXISTS `cv_logs`.`test` ON CLUSTER 'logs' AS `cv_logs`.`test_local` ENGINE = Distributed('logs', 'cv_logs', 'test_local', rand())",
	}, "cv_logs", "test")
	if err != nil {
		t.Fatalf("logLibraryPhysicalTableRefs() error = %v", err)
	}
	if len(refs) != 4 {
		t.Fatalf("expected 4 physical tables, got %d: %#v", len(refs), refs)
	}
	if refs[3].Name != "cv_logs.test" || refs[3].Role != "distributed" {
		t.Fatalf("unexpected distributed table: %#v", refs[3])
	}
}
