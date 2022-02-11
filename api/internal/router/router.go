package router

import (
	"net/http"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/apiv1/base"
	"github.com/shimohq/mogo/api/internal/apiv1/configure"
	"github.com/shimohq/mogo/api/internal/apiv1/inquiry"
	"github.com/shimohq/mogo/api/internal/apiv1/kube"
	"github.com/shimohq/mogo/api/internal/apiv1/permission"
	"github.com/shimohq/mogo/api/internal/apiv1/setting"
	"github.com/shimohq/mogo/api/internal/apiv1/sys"
	"github.com/shimohq/mogo/api/internal/apiv1/user"
	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/middlewares"

	"github.com/gotomicro/ego/server/egin"

	"github.com/shimohq/mogo/api/pkg/component/core"
)

func GetRouter() *egin.Component {
	r := invoker.Gin
	r.Use(invoker.Session)

	r.NoRoute(core.Handle(func(c *core.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSONE(http.StatusNotFound, "", nil)
			return
		}
		elog.Debug("static", elog.String("path", c.Request.URL.Path))
		c.FileFromFS(c.Request.URL.Path, invoker.Gin.HTTPEmbedFs())
		return
	}))

	// non-authentication api
	r.POST("/api/admin/users/login", core.Handle(user.Login))
	r.GET("/api/admin/login/:oauth", core.Handle(user.Oauth))

	v1 := r.Group("/api/v1", middlewares.AuthChecker())
	// User related
	{
		v1.GET("/menus/list", core.Handle(permission.MenuList))
		v1.GET("/users/info", core.Handle(user.Info))
		v1.POST("/users/logout", core.Handle(user.Logout))
	}
	// System configuration
	{
		// Database instance configuration
		v1.POST("/sys/instances", core.Handle(sys.InstanceCreate))
		v1.GET("/sys/instances", core.Handle(sys.InstanceList))
		v1.PATCH("/sys/instances/:id", core.Handle(sys.InstanceUpdate))
		v1.DELETE("/sys/instances/:id", core.Handle(sys.InstanceDelete))
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
		v1.POST("/configurations", core.Handle(configure.Create))
		v1.POST("/configurations/:id/sync", core.Handle(configure.Sync))
		v1.PATCH("/configurations/:id", core.Handle(configure.Update))
		v1.DELETE("/configurations/:id", core.Handle(configure.Delete))
		v1.POST("/configurations/:id/publish", core.Handle(configure.Publish))
		v1.GET("/configurations/:id/histories", core.Handle(configure.HistoryList))
		v1.GET("/configurations/:id/histories/:version", core.Handle(configure.HistoryInfo))
		v1.GET("/configurations/:id/diff", core.Handle(configure.Diff))
		v1.GET("/configurations/:id/lock", core.Handle(configure.Lock))
		v1.POST("/configurations/:id/unlock", core.Handle(configure.Unlock))
	}
	// Cluster-related interfaces
	{
		v1.GET("/clusters", core.Handle(kube.ClusterList))
		v1.GET("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapList))
		v1.POST("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapCreate))
		v1.GET("/clusters/:clusterId/namespace/:namespace/configmaps/:name", core.Handle(kube.ConfigMapInfo))
	}
	// Trace
	{
		// v1.GET("/traces/:tid", core.Handle(trace.Info))
	}
	// Database
	{
		v1.POST("/instances/:iid/databases", core.Handle(base.DatabaseCreate))
		v1.GET("/instances/:iid/databases", core.Handle(base.DatabaseList))
		v1.DELETE("/databases/:id", core.Handle(base.DatabaseDelete))
	}
	// Table
	{
		v1.POST("/databases/:did/tables", core.Handle(base.TableCreate))
		v1.GET("/databases/:did/tables", core.Handle(base.TableList))
		v1.DELETE("/tables/:id", core.Handle(base.TableDelete))
		v1.GET("/tables/:id", core.Handle(base.TableInfo))
		v1.GET("/tables/:id/logs", core.Handle(inquiry.Logs))
		v1.GET("/tables/:id/charts", core.Handle(inquiry.Charts))

		v1.GET("/tables/:id/indexes/:idx", core.Handle(inquiry.Indexes))
		v1.PATCH("/tables/:id/indexes", core.Handle(setting.IndexUpdate))
		v1.GET("/tables/:id/indexes", core.Handle(setting.Indexes))

		v1.GET("/table/id", core.Handle(base.TableId))
	}
	// View
	{
		v1.GET("/views/:id", core.Handle(base.ViewInfo))
		v1.PATCH("/views/:id", core.Handle(base.ViewUpdate))
		v1.DELETE("/views/:id", core.Handle(base.ViewDelete))
		v1.GET("/tables/:id/views", core.Handle(base.ViewList))
		v1.POST("/tables/:id/views", core.Handle(base.ViewCreate))
	}
	return r
}
