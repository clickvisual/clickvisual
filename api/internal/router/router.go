package router

import (
	"github.com/kl7sn/toolkit/kfile"

	"github.com/shimohq/mogo/api/internal/apiv1/configure"
	"github.com/shimohq/mogo/api/internal/apiv1/inquiry"
	"github.com/shimohq/mogo/api/internal/apiv1/kube"
	"github.com/shimohq/mogo/api/internal/apiv1/permission"
	"github.com/shimohq/mogo/api/internal/apiv1/setting"
	"github.com/shimohq/mogo/api/internal/apiv1/static"
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

	// static file
	flag, err := kfile.IsFileExists("./ui/dist")
	if err != nil || !flag {
		panic("ui/dist not exist")
	}
	r.GET("/", core.Handle(static.File))
	r.NoRoute(core.Handle(static.Filter))

	// non-authentication api
	r.POST("/api/admin/users/login", core.Handle(user.Login))
	r.GET("/api/admin/login/:oauth", core.Handle(user.Oauth))

	v1 := r.Group("/api/v1", middlewares.AuthChecker())
	// 用户相关
	{
		v1.GET("/menus/list", core.Handle(permission.MenuList))
		v1.GET("/users/info", core.Handle(user.Info))
		v1.POST("/users/logout", core.Handle(user.Logout))
	}
	// 数据查询
	{
		v1.GET("/query/logs", core.Handle(inquiry.Logs))
		v1.GET("/query/charts", core.Handle(inquiry.Charts))
		v1.GET("/query/tables", core.Handle(inquiry.Tables))
		v1.GET("/query/databases", core.Handle(inquiry.Databases))
		v1.GET("/query/indexes", core.Handle(inquiry.Indexes))
	}
	// 系统配置
	{
		// 数据库实例配置
		v1.POST("/sys/instances", core.Handle(sys.InstanceCreate))
		v1.GET("/sys/instances", core.Handle(sys.InstanceList))
		v1.PATCH("/sys/instances/:id", core.Handle(sys.InstanceUpdate))
		v1.DELETE("/sys/instances/:id", core.Handle(sys.InstanceDelete))
		// 集群配置
		v1.GET("/sys/clusters/:id", core.Handle(setting.ClusterInfo))
		v1.GET("/sys/clusters", core.Handle(setting.ClusterPageList))
		v1.POST("/sys/clusters", core.Handle(setting.ClusterCreate))
		v1.PATCH("/sys/clusters/:id", core.Handle(setting.ClusterUpdate))
		v1.DELETE("/sys/clusters/:id", core.Handle(setting.ClusterDelete))
	}
	// 数据表自定义设置
	{
		v1.PATCH("/setting/indexes", core.Handle(setting.IndexUpdate))
		v1.GET("/setting/indexes", core.Handle(setting.Indexes))
	}
	// 配置管理
	{
		v1.GET("/configurations", core.Handle(configure.List))                  // 配置文件列表
		v1.GET("/configurations/:id", core.Handle(configure.Detail))            // 配置文件内容
		v1.POST("/configurations", core.Handle(configure.Create))               // 配置新建
		v1.PATCH("/configurations/:id", core.Handle(configure.Update))          // 配置更新
		v1.DELETE("/configurations/:id", core.Handle(configure.Delete))         // 配置删除
		v1.POST("/configurations/:id/publish", core.Handle(configure.Publish))  // 配置发布
		v1.GET("/configurations/:id/histories", core.Handle(configure.History)) // 配置文件历史
		v1.GET("/configurations/diff", core.Handle(configure.Diff))             // Diff
		v1.GET("/configurations/:id/lock", core.Handle(configure.Lock))         // 获取编辑锁
		v1.POST("/configurations/:id/unlock", core.Handle(configure.Unlock))    // 解锁
	}
	// 集群相关接口
	{
		v1.GET("/clusters", core.Handle(kube.ClusterList))                                            // 获取集群列表
		v1.GET("/clusters/:clusterId/namespace/configmaps", core.Handle(kube.NamespaceConfigMapList)) // 获取集群内部的 configmap 数据
	}
	return r
}
