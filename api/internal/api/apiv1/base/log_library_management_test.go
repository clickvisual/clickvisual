package base

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
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
