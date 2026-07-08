package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/ui/v2dist"
)

func TestIsV2Asset(t *testing.T) {
	cases := []struct {
		name string
		path string
		want bool
	}{
		{name: "v2 root", path: "/v2", want: true},
		{name: "v2 root slash", path: "/v2/", want: true},
		{name: "v2 nested route", path: "/v2/reports", want: true},
		{name: "v1 route", path: "/query", want: false},
		{name: "api route", path: "/api/v2/base/users", want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isV2Asset(tc.path); got != tc.want {
				t.Fatalf("isV2Asset(%q) = %v, want %v", tc.path, got, tc.want)
			}
		})
	}
}

func TestShouldRedirectLegacyQueryEntry(t *testing.T) {
	cases := []struct {
		name     string
		path     string
		rawQuery string
		want     bool
	}{
		{name: "legacy query", path: "/query", want: true},
		{name: "legacy query slash", path: "/query/", want: true},
		{name: "legacy query explicit v1", path: "/query", rawQuery: "ui=v1", want: false},
		{name: "v2 query", path: "/v2/query", want: false},
		{name: "api query", path: "/api/v2/query/run", want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldRedirectLegacyQueryEntry(tc.path, tc.rawQuery); got != tc.want {
				t.Fatalf("shouldRedirectLegacyQueryEntry(%q, %q) = %v, want %v", tc.path, tc.rawQuery, got, tc.want)
			}
		})
	}
}

func TestBuildDefaultV2QueryRedirectURL(t *testing.T) {
	cases := []struct {
		name      string
		appSubURL string
		rawQuery  string
		want      string
	}{
		{name: "root", want: "/v2/query"},
		{name: "subpath", appSubURL: "/clickvisual", want: "/clickvisual/v2/query"},
		{name: "preserve query", appSubURL: "/clickvisual", rawQuery: "instanceId=1&database=default", want: "/clickvisual/v2/query?database=default&instanceId=1"},
		{name: "drop ui bypass", appSubURL: "/clickvisual", rawQuery: "ui=v1&instanceId=1", want: "/clickvisual/v2/query?instanceId=1"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := buildDefaultV2QueryRedirectURL(tc.appSubURL, tc.rawQuery); got != tc.want {
				t.Fatalf("buildDefaultV2QueryRedirectURL(%q, %q) = %q, want %q", tc.appSubURL, tc.rawQuery, got, tc.want)
			}
		})
	}
}

func TestNoRouteServesV2Index(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.NoRoute(core.Handle(func(c *core.Context) {
		if isV2Asset(c.Request.URL.Path) {
			v2dist.Serve(c, c.Request.URL.Path)
			return
		}
		c.Status(http.StatusNotFound)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v2/reports", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, resp.Code)
	}
	if !strings.Contains(resp.Body.String(), "<div id=\"root\"></div>") {
		t.Fatalf("expected v2 app html shell, got %q", resp.Body.String())
	}
}

func TestNoRouteDoesNotServeV2IndexForV1Path(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.NoRoute(core.Handle(func(c *core.Context) {
		if isV2Asset(c.Request.URL.Path) {
			v2dist.Serve(c, c.Request.URL.Path)
			return
		}
		c.Status(http.StatusNotFound)
	}))

	req := httptest.NewRequest(http.MethodGet, "/query", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, resp.Code)
	}
}

func TestNoRouteServesV2StaticFile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.NoRoute(core.Handle(func(c *core.Context) {
		if isV2Asset(c.Request.URL.Path) {
			v2dist.Serve(c, c.Request.URL.Path)
			return
		}
		c.Status(http.StatusNotFound)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v2/clickvisual-v2-probe.txt", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, resp.Code)
	}
	if !strings.Contains(resp.Body.String(), "clickvisual-v2-static-ok") {
		t.Fatalf("expected probe content, got %q", resp.Body.String())
	}
}

func TestV2RoutesDefaultToFullEdition(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	gin.SetMode(gin.TestMode)
	r := gin.New()

	v2(r.Group(""))

	routes := routeSet(r)
	for _, item := range []routeKey{
		{method: http.MethodPost, path: "/api/v2/query/run"},
		{method: http.MethodPost, path: "/api/v2/query/ingestion/publish"},
		{method: http.MethodPost, path: "/api/v2/reports"},
		{method: http.MethodGet, path: "/api/v2/alert/settings"},
		{method: http.MethodGet, path: "/api/v2/pandas/workers"},
		{method: http.MethodGet, path: "/api/v2/base/users"},
	} {
		if !routes[item] {
			t.Fatalf("expected full route %s %s", item.method, item.path)
		}
	}
}

func TestV2RoutesPrivateLiteEdition(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	gin.SetMode(gin.TestMode)
	r := gin.New()

	v2(r.Group(""))

	routes := routeSet(r)
	for _, item := range []routeKey{
		{method: http.MethodGet, path: "/api/v2/base/instances"},
		{method: http.MethodGet, path: "/api/v2/base/settings/instances"},
		{method: http.MethodGet, path: "/api/v2/query/filters"},
		{method: http.MethodGet, path: "/api/v2/query/instances/:instance-id/databases/:database/tables"},
		{method: http.MethodPost, path: "/api/v2/query/compile"},
		{method: http.MethodPost, path: "/api/v2/query/run"},
		{method: http.MethodPost, path: "/api/v2/query/field-stats"},
		{method: http.MethodGet, path: "/api/v2/query/tokens"},
	} {
		if !routes[item] {
			t.Fatalf("expected private-lite route %s %s", item.method, item.path)
		}
	}
	for _, item := range []routeKey{
		{method: http.MethodPost, path: "/api/v2/query/ingestion/publish"},
		{method: http.MethodPost, path: "/api/v2/storage"},
		{method: http.MethodPost, path: "/api/v2/reports"},
		{method: http.MethodGet, path: "/api/v2/alert/settings"},
		{method: http.MethodGet, path: "/api/v2/pandas/workers"},
		{method: http.MethodGet, path: "/api/v2/base/users"},
	} {
		if routes[item] {
			t.Fatalf("did not expect private-lite route %s %s", item.method, item.path)
		}
	}
}

type routeKey struct {
	method string
	path   string
}

func routeSet(r *gin.Engine) map[routeKey]bool {
	res := make(map[routeKey]bool)
	for _, route := range r.Routes() {
		res[routeKey{method: route.Method, path: route.Path}] = true
	}
	return res
}
