package v2dist

import (
	"bytes"
	"embed"
	"encoding/json"
	"html"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	appconfig "github.com/clickvisual/clickvisual/api/internal/pkg/config"
)

//go:embed dist
var distFiles embed.FS

func Serve(c *core.Context, requestPath string) {
	filePath := resolveFilePath(requestPath)
	if filePath != "index.html" && serveFile(c, filePath) {
		return
	}
	ServeIndex(c)
}

func ServeIndex(c *core.Context) {
	serveIndex(c, c.Request.URL.Path)
}

func resolveFilePath(requestPath string) string {
	cleaned := path.Clean("/" + requestPath)
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "v2" || cleaned == "v2/" {
		return "index.html"
	}
	if !strings.HasPrefix(cleaned, "v2/") {
		return "index.html"
	}
	relativePath := strings.TrimPrefix(cleaned, "v2/")
	if relativePath == "" || relativePath == "." {
		return "index.html"
	}
	return relativePath
}

func serveFile(c *core.Context, filePath string) bool {
	data, err := readFile(filePath)
	if err != nil {
		return false
	}
	writeResponse(c, filePath, data)
	return true
}

func serveIndex(c *core.Context, requestPath string) bool {
	data, err := readFile("index.html")
	if err != nil {
		return false
	}
	writeResponse(c, "index.html", rewriteIndexAssetPaths(data, requestPath))
	return true
}

func writeResponse(c *core.Context, filePath string, data []byte) {
	contentType := mime.TypeByExtension(path.Ext(filePath))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	if strings.HasSuffix(contentType, "text/plain; charset=utf-8") && path.Ext(filePath) == ".html" {
		contentType = "text/html; charset=utf-8"
	}
	c.Header("Content-Type", contentType)
	c.Status(http.StatusOK)
	if _, err := c.Writer.Write(data); err != nil {
		c.Error(err)
	}
}

func readFile(filePath string) ([]byte, error) {
	distFS, err := fs.Sub(distFiles, "dist")
	if err != nil {
		return nil, err
	}
	return fs.ReadFile(distFS, filePath)
}

func rewriteIndexAssetPaths(data []byte, requestPath string) []byte {
	assetBasePath := html.EscapeString(getV2AssetBasePath(requestPath) + "assets/")
	assetBase := []byte(`"` + assetBasePath)
	rewritten := bytes.ReplaceAll(data, []byte(`"./assets/`), assetBase)
	rewritten = bytes.ReplaceAll(rewritten, []byte(`'./assets/`), append([]byte{'\''}, assetBase[1:]...))
	return injectRuntimeConfig(rewritten)
}

func getV2AssetBasePath(requestPath string) string {
	cleaned := path.Clean("/" + requestPath)
	v2Index := strings.Index(cleaned, "/v2")
	if v2Index < 0 {
		shareIndex := strings.Index(cleaned, "/share")
		if shareIndex >= 0 {
			basePath := cleaned[:shareIndex] + "/v2/"
			if !isSafeV2AssetBasePath(basePath) {
				return "/v2/"
			}
			return basePath
		}
		return "/v2/"
	}
	basePath := cleaned[:v2Index] + "/v2/"
	if !isSafeV2AssetBasePath(basePath) {
		return "/v2/"
	}
	return basePath
}

func isSafeV2AssetBasePath(basePath string) bool {
	if !strings.HasPrefix(basePath, "/") || !strings.HasSuffix(basePath, "/v2/") {
		return false
	}
	for _, ch := range basePath {
		if ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' {
			continue
		}
		switch ch {
		case '/', '-', '_', '.', '~':
			continue
		default:
			return false
		}
	}
	return true
}

func injectRuntimeConfig(data []byte) []byte {
	payload, err := json.Marshal(map[string]string{"edition": appconfig.Edition()})
	if err != nil {
		return data
	}
	script := []byte(`<script>window.__CLICKVISUAL_V2_CONFIG__=` + string(payload) + `;</script>`)
	if bytes.Contains(data, script) {
		return data
	}
	if bytes.Contains(data, []byte("</head>")) {
		return bytes.Replace(data, []byte("</head>"), append(script, []byte("</head>")...), 1)
	}
	return append(script, data...)
}
