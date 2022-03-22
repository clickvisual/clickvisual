package router

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/apiv1/alarm"
	"github.com/shimohq/mogo/api/internal/apiv1/base"
	"github.com/shimohq/mogo/api/internal/apiv1/configure"
	"github.com/shimohq/mogo/api/internal/apiv1/initialize"
	"github.com/shimohq/mogo/api/internal/apiv1/kube"
	"github.com/shimohq/mogo/api/internal/apiv1/permission"
	"github.com/shimohq/mogo/api/internal/apiv1/setting"
	"github.com/shimohq/mogo/api/pkg/utils"

	"github.com/shimohq/mogo/api/internal/apiv1/user"
	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/middlewares"

	"github.com/gotomicro/ego/server/egin"

	"github.com/shimohq/mogo/api/pkg/component/core"
)

func GetRouter() *egin.Component {

	appUrl, appSubUrl, err := utils.ParseAppUrlAndSubUrl(econf.GetString("app.rootURL"))
	if err != nil {
		panic(err.Error())
	}
	invoker.Logger.Info("ParseAppUrlAndSubUrl", elog.String("appUrl", appUrl), elog.String("appSubUrl", appSubUrl))

	serveFromSubPath := econf.GetBool("app.serveFromSubPath")

	r := invoker.Gin
	r.Use(invoker.Session)

	r.NoRoute(core.Handle(func(c *core.Context) {
		prefix := "/api/"
		if serveFromSubPath {
			prefix = appSubUrl + prefix
			// if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			// 	c.Redirect(302, strings.TrimRight(appUrl, "/")+c.Request.URL.Path)
			// 	return
			// }
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

		// path := strings.Replace(c.Request.URL.Path, appSubUrl, "", 1)
		// path := appSubUrl + c.Request.URL.Path
		// invoker.Logger.Debug("ParseAppUrlAndSubUrl", elog.String("queryPath", c.Request.URL.Path), elog.String("filterPath", path))
		c.FileFromFS(c.Request.URL.Path, invoker.Gin.HTTPEmbedFs())
		return
	}))

	apiPrefix := "/api"
	if serveFromSubPath {
		apiPrefix = appSubUrl + apiPrefix
	}
	admin := r.Group(apiPrefix + "/admin")
	{
		// non-authentication api
		admin.GET("/login/:oauth", core.Handle(user.Oauth))
		admin.POST("/users/login", core.Handle(user.Login))
	}

	v1Open := r.Group(apiPrefix + "/v1")
	{
		// webhook
		v1Open.POST("/prometheus/alerts", core.Handle(alarm.Webhook))
		// mock
		v1Open.POST("/install", core.Handle(initialize.Install))
		v1Open.GET("/install", core.Handle(initialize.IsInstall))
	}

	v1 := r.Group(apiPrefix+"/v1", middlewares.AuthChecker())
	// User related
	{
		// init
		v1.GET("/migration", core.Handle(initialize.Migration))

		// user
		v1.GET("/menus/list", core.Handle(permission.MenuList))
		v1.GET("/users/info", core.Handle(user.Info))
		v1.POST("/users/logout", core.Handle(user.Logout))
		v1.PATCH("/users/:uid/password", core.Handle(user.UpdatePassword))
	}
	// System configuration
	{
		// Database instance configuration
		v1.POST("/sys/instances", core.Handle(setting.InstanceCreate))
		v1.GET("/sys/instances", core.Handle(setting.InstanceList))
		v1.PATCH("/sys/instances/:id", core.Handle(setting.InstanceUpdate))
		v1.DELETE("/sys/instances/:id", core.Handle(setting.InstanceDelete))
		// Cluster configuration
		v1.GET("/sys/clusters/:id", core.Handle(setting.ClusterInfo))
		v1.GET("/sys/clusters", core.Handle(setting.ClusterPageList))
		v1.POST("/sys/clusters", core.Handle(setting.ClusterCreate))
		v1.PATCH("/sys/clusters/:id", core.Handle(setting.ClusterUpdate))
		v1.DELETE("/sys/clusters/:id", core.Handle(setting.ClusterDelete))
	}
	// Configuration management
	{
		v1.GET("/configurations", core.Handle(configure.List))
		v1.GET("/configurations/:id", core.Handle(configure.Detail))
		v1.GET("/configurations/:id/histories", core.Handle(configure.HistoryList))
		v1.GET("/configurations/:id/histories/:version", core.Handle(configure.HistoryInfo))
		v1.GET("/configurations/:id/diff", core.Handle(configure.Diff))
		v1.GET("/configurations/:id/lock", core.Handle(configure.Lock))
		v1.POST("/configurations/:id/publish", core.Handle(configure.Publish))
		v1.POST("/configurations/:id/unlock", core.Handle(configure.Unlock))
		v1.POST("/configurations", core.Handle(configure.Create))
		v1.POST("/configurations/:id/sync", core.Handle(configure.Sync))
		v1.PATCH("/configurations/:id", core.Handle(configure.Update))
		v1.DELETE("/configurations/:id", core.Handle(configure.Delete))
	}
	// Cluster-related interfaces
	{
		v1.GET("/clusters", core.Handle(kube.ClusterList))
		v1.GET("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapList))
		v1.GET("/clusters/:clusterId/namespace/:namespace/configmaps/:name", core.Handle(kube.ConfigMapInfo))
		v1.POST("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapCreate))
	}
	// Instance
	{
		v1.POST("/instances/:iid/tables-exist", core.Handle(base.TableCreateSelfBuilt))
		v1.GET("/instances/:iid/columns-self-built", core.Handle(base.TableColumnsSelfBuilt))
		v1.GET("/instances/:iid/databases-exist", core.Handle(base.DatabaseExistList))
		v1.GET("/instances/:iid/databases", core.Handle(base.DatabaseList))
		v1.POST("/instances/:iid/databases", core.Handle(base.DatabaseCreate))
	}
	// Database
	{
		v1.GET("/databases/:did/tables", core.Handle(base.TableList))
		v1.POST("/databases/:did/tables", core.Handle(base.TableCreate))
		v1.DELETE("/databases/:id", core.Handle(base.DatabaseDelete))
	}
	// Table
	{

		v1.GET("/table/id", core.Handle(base.TableId))
		v1.GET("/tables/:id", core.Handle(base.TableInfo))
		v1.DELETE("/tables/:id", core.Handle(base.TableDelete))
		v1.GET("/tables/:id/logs", core.Handle(base.TableLogs))
		v1.GET("/tables/:id/charts", core.Handle(base.TableCharts))
		v1.GET("/tables/:id/views", core.Handle(base.ViewList))
		v1.POST("/tables/:id/views", core.Handle(base.ViewCreate))
		v1.GET("/tables/:id/indexes", core.Handle(setting.Indexes))
		v1.GET("/tables/:id/indexes/:idx", core.Handle(base.TableIndexes))
		v1.PATCH("/tables/:id/indexes", core.Handle(setting.IndexUpdate))
	}
	// view
	{
		v1.GET("/views/:id", core.Handle(base.ViewInfo))
		v1.PATCH("/views/:id", core.Handle(base.ViewUpdate))
		v1.DELETE("/views/:id", core.Handle(base.ViewDelete))
	}
	// alarm
	{
		v1.GET("/alarms", core.Handle(alarm.List))
		v1.GET("/alarms/:id", core.Handle(alarm.Info))
		v1.POST("/alarms", core.Handle(alarm.Create))
		v1.PATCH("/alarms/:id", core.Handle(alarm.Update))
		v1.DELETE("/alarms/:id", core.Handle(alarm.Delete))

		v1.GET("/alarms-histories", core.Handle(alarm.HistoryList))
		v1.GET("/alarms-histories/:id", core.Handle(alarm.HistoryInfo))

		v1.GET("/alarms-channels", core.Handle(alarm.ChannelList))
		v1.GET("/alarms-channels/:id", core.Handle(alarm.ChannelInfo))
		v1.POST("/alarms-channels", core.Handle(alarm.ChannelCreate))
		v1.PATCH("/alarms-channels/:id", core.Handle(alarm.ChannelUpdate))
		v1.DELETE("/alarms-channels/:id", core.Handle(alarm.ChannelDelete))
	}
	return r
}
