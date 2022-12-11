package router

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/server/egin"

	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/initialize"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/user"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/alert"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

func GetRouter() *egin.Component {
	_, appSubUrl, err := utils.ParseAppUrlAndSubUrl(econf.GetString("app.rootURL"))
	if err != nil {
		panic(err.Error())
	}
	serveFromSubPath := econf.GetBool("app.serveFromSubPath")
	r := invoker.Gin
	r.Use(invoker.Session)
	r.NoRoute(core.Handle(func(c *core.Context) {
		prefix := "/api/"
		if serveFromSubPath {
			prefix = appSubUrl + prefix
		}
		if strings.HasPrefix(c.Request.URL.Path, prefix) {
			c.JSONE(http.StatusNotFound, "", nil)
			return
		}
		maxAge := econf.GetInt("server.http.maxAge")
		if maxAge == 0 {
			maxAge = 86400
		}
		c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
		path := strings.Replace(c.Request.URL.Path, appSubUrl, "", 1)
		c.FileFromFS(path, invoker.Gin.HTTPEmbedFs())
		return
	}))
	apiPrefix := ""
	if serveFromSubPath {
		apiPrefix = appSubUrl
	}
	g := r.Group(apiPrefix)

	v1Open := g.Group("/api/v1")
	{
		v1Open.POST("/install", core.Handle(initialize.Install))
		v1Open.GET("/install", core.Handle(initialize.IsInstall))
		v1Open.POST("/prometheus/alerts", core.Handle(alert.Webhook))
	}
	admin := g.Group("/api/admin")
	{
		admin.GET("/login/:oauth", core.Handle(user.Oauth)) // non-authentication api
		admin.POST("/users/login", core.Handle(user.Login))
	}

	v1(g)
	v2(g)
	v3(g)
	return r
}
