package router

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/server/egin"

	"github.com/clickvisual/clickvisual/api/internal/api/agent"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/initialize"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/user"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/alert"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/base"
	queryv2 "github.com/clickvisual/clickvisual/api/internal/api/apiv2/query"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/ui/v2dist"
)

func GetServerRouter() *egin.Component {
	_, appSubUrl, err := utils.ParseAppUrlAndSubUrl(econf.GetString("app.rootURL"))
	if err != nil {
		panic(err.Error())
	}
	serveFromSubPath := econf.GetBool("app.serveFromSubPath")
	r := invoker.Gin
	r.Use(invoker.Session)
	r.NoRoute(egin.Gzip(egin.DefaultCompression, egin.WithGzipExcludedExtensions([]string{"", ".html"})), core.Handle(func(c *core.Context) {
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
			maxAge = 31536000
		}
		path := strings.Replace(c.Request.URL.Path, appSubUrl, "", 1)
		if shouldRedirectDefaultV2Entry(path, c.Request.URL.RawQuery) {
			c.Redirect(http.StatusFound, buildDefaultV2QueryRedirectURL(appSubUrl, c.Request.URL.RawQuery))
			return
		}
		c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, public", maxAge))
		c.Header("Expires", time.Now().AddDate(1, 0, 0).Format("Mon, 01 Jan 2006 00:00:00 GMT"))
		if isV2Asset(path) {
			v2dist.Serve(c, path)
			return
		}
		c.FileFromFS(path, r.HTTPEmbedFs())
	}))
	apiPrefix := ""
	if serveFromSubPath {
		apiPrefix = appSubUrl
	}
	g := r.Group(apiPrefix)
	r.Group(apiPrefix).GET("/api/share/:s-code", middlewares.AuthChecker(), core.Handle(base.ShortURLRedirect))

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
	v2Open := g.Group("/api/v2")
	{
		v2Open.POST("/query/token/run", core.Handle(queryv2.TokenRun))
	}

	v1(g)
	v2(g)

	return r
}

func GetAgentRouter() *egin.Component {
	g := egin.Load("server.http").Build()
	k8sAgent := agent.NewAgent()
	g.GET("/api/v1/search", core.Handle(k8sAgent.Search))
	g.GET("/api/v1/charts", core.Handle(k8sAgent.Charts))
	return g
}

func isV2Asset(path string) bool {
	if path == "/v2" {
		return true
	}
	return strings.HasPrefix(path, "/v2/")
}

func shouldRedirectDefaultV2Entry(pathValue string, rawQuery string) bool {
	if pathValue != "/" && pathValue != "/query" && pathValue != "/query/" {
		return false
	}
	if pathValue == "/" {
		return true
	}
	values, err := url.ParseQuery(rawQuery)
	if err == nil && values.Get("ui") == "v1" {
		return false
	}
	return true
}

func buildDefaultV2QueryRedirectURL(appSubURL string, rawQuery string) string {
	target := strings.TrimRight(appSubURL, "/") + "/v2/query"
	values, err := url.ParseQuery(rawQuery)
	if err == nil {
		values.Del("ui")
		rawQuery = values.Encode()
	}
	if rawQuery == "" {
		return target
	}
	return target + "?" + rawQuery
}
