package router

import (
	"net/http"
	"strings"

	"github.com/gotomicro/ego/core/elog"

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
	// Data query
	{
		v1.GET("/query/logs", core.Handle(inquiry.Logs))
		v1.GET("/query/charts", core.Handle(inquiry.Charts))
		v1.GET("/query/tables", core.Handle(inquiry.Tables))
		v1.GET("/query/databases", core.Handle(inquiry.Databases))
		v1.GET("/query/indexes", core.Handle(inquiry.Indexes))
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
	// Data Table Customization Settings
	{
		v1.PATCH("/setting/indexes", core.Handle(setting.IndexUpdate))
		v1.GET("/setting/indexes", core.Handle(setting.Indexes))
	}
	// Configuration management
	{
		v1.GET("/configurations", core.Handle(configure.List))
		v1.GET("/configurations/:id", core.Handle(configure.Detail))
		v1.POST("/configurations", core.Handle(configure.Create))
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
	return r
}
