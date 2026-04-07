package v2dist

import (
	"bytes"
	"embed"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
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
	assetBase := []byte(`"` + getV2AssetBasePath(requestPath) + `assets/`)
	rewritten := bytes.ReplaceAll(data, []byte(`"./assets/`), assetBase)
	return bytes.ReplaceAll(rewritten, []byte(`'./assets/`), append([]byte{'\''}, assetBase[1:]...))
}

func getV2AssetBasePath(requestPath string) string {
	cleaned := path.Clean("/" + requestPath)
	v2Index := strings.Index(cleaned, "/v2")
	if v2Index < 0 {
		return "/v2/"
	}
	return cleaned[:v2Index] + "/v2/"
}
