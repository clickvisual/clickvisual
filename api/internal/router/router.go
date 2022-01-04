package router

import (
	"github.com/kl7sn/toolkit/kfile"

	"github.com/shimohq/mogo/api/internal/apiv1/inquiry"
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
	// {
	// 	v1.GET("/configs", core.Handle(configs.List))          // 配置文件列表
	// 	v1.GET("/configs/:id", core.Handle(configs.Detail))    // 配置文件内容
	// 	v1.POST("/configs", core.Handle(configs.Create))       // 配置新建
	// 	v1.PATCH("/configs/:id", core.Handle(configs.Update))  // 配置更新
	// 	v1.DELETE("/configs/:id", core.Handle(configs.Delete)) // 配置删除
	//
	// 	v1.POST("/configs/:id/publish", core.Handle(configs.Publish)) // 配置发布
	// 	v1.GET("/configs/:id/history", core.Handle(configs.History))  // 配置文件历史
	// 	v1.GET("/configs/diff", core.Handle(configs.Diff))            // Diff
	// 	v1.GET("/configs/:id/lock", core.Handle(configs.Lock))        // 获取编辑锁
	// 	v1.POST("/configs/:id/unlock", core.Handle(configs.Unlock))   // 解锁
	// }
	return r
}
