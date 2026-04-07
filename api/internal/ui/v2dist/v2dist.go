package v2dist

import (
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
	serveFile(c, "index.html")
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
	contentType := mime.TypeByExtension(path.Ext(filePath))
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	if strings.HasSuffix(contentType, "text/plain; charset=utf-8") && path.Ext(filePath) == ".html" {
		contentType = "text/html; charset=utf-8"
	}
	c.Header("Content-Type", contentType)
	c.Status(http.StatusOK)
	if _, err = c.Writer.Write(data); err != nil {
		c.Error(err)
	}
	return true
}

func readFile(filePath string) ([]byte, error) {
	distFS, err := fs.Sub(distFiles, "dist")
	if err != nil {
		return nil, err
	}
	return fs.ReadFile(distFS, filePath)
}
