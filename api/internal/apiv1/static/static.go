package static

import (
	"net/http"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/pkg/component/core"
)

func File(c *core.Context) {
	c.File("ui/dist/index.html")
}

func Filter(c *core.Context) {
	if strings.HasPrefix(c.Request.URL.Path, "/api/") {
		c.JSONE(http.StatusNotFound, "", nil)
		return
	}
	elog.Debug("static", elog.String("path", c.Request.URL.Path))
	c.File("ui/dist/" + c.Request.URL.Path)
	return
}
