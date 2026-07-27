package v2dist

import (
	"strings"
	"testing"

	"github.com/gotomicro/ego/core/econf"
)

func TestGetV2AssetBasePath(t *testing.T) {
	cases := []struct {
		name        string
		requestPath string
		want        string
	}{
		{name: "root v2 route", requestPath: "/v2/reports/1", want: "/v2/"},
		{name: "subpath v2 route", requestPath: "/clickvisual/v2/reports/1", want: "/clickvisual/v2/"},
		{name: "unsafe subpath fallback", requestPath: `/clickvisual"><script>/v2/reports/1`, want: "/v2/"},
		{name: "root share route", requestPath: "/share", want: "/v2/"},
		{name: "subpath share route", requestPath: "/clickvisual/share", want: "/clickvisual/v2/"},
		{name: "unsafe share subpath fallback", requestPath: `/clickvisual"><script>/share`, want: "/v2/"},
		{name: "fallback", requestPath: "/query", want: "/v2/"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := getV2AssetBasePath(tc.requestPath); got != tc.want {
				t.Fatalf("getV2AssetBasePath(%q) = %q, want %q", tc.requestPath, got, tc.want)
			}
		})
	}
}

func TestRewriteIndexAssetPaths(t *testing.T) {
	html := []byte(`<script type="module" src="./assets/index.js"></script><link rel="stylesheet" href="./assets/index.css">`)

	rewritten := string(rewriteIndexAssetPaths(html, "/clickvisual/v2/reports/1"))

	if !strings.Contains(rewritten, `src="/clickvisual/v2/assets/index.js"`) {
		t.Fatalf("expected script asset path to be rewritten, got %q", rewritten)
	}
	if !strings.Contains(rewritten, `href="/clickvisual/v2/assets/index.css"`) {
		t.Fatalf("expected stylesheet asset path to be rewritten, got %q", rewritten)
	}
	if strings.Contains(rewritten, `./assets/`) {
		t.Fatalf("expected no relative asset paths to remain, got %q", rewritten)
	}
}

func TestRewriteIndexInjectsRuntimeEdition(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "private-lite")
	html := []byte(`<html><head></head><body><script type="module" src="./assets/index.js"></script></body></html>`)

	rewritten := string(rewriteIndexAssetPaths(html, "/v2/query"))

	if !strings.Contains(rewritten, `window.__CLICKVISUAL_V2_CONFIG__={"edition":"private-lite"}`) {
		t.Fatalf("expected runtime edition injection, got %q", rewritten)
	}
	if !strings.Contains(rewritten, `</script></head>`) {
		t.Fatalf("expected runtime script inside head, got %q", rewritten)
	}
}
