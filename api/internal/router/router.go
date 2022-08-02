package router

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/server/egin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/clickvisual/clickvisual/api/internal/apiv1/alarm"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/base"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/bigdata"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/bigdata/mining"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/configure"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/event"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/initialize"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/kube"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/permission"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/setting"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/template"
	"github.com/clickvisual/clickvisual/api/internal/apiv1/user"
	basev2 "github.com/clickvisual/clickvisual/api/internal/apiv2/base"
	"github.com/clickvisual/clickvisual/api/internal/apiv2/pandas"
	"github.com/clickvisual/clickvisual/api/internal/apiv2/storage"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/middlewares"
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

	apiPrefix := "/api"
	if serveFromSubPath {
		apiPrefix = appSubUrl + apiPrefix
	}

	v1Open := r.Group(apiPrefix + "/v1")
	{
		// webhook
		v1Open.POST("/prometheus/alerts", core.Handle(alarm.Webhook))
		// alarms send test
		v1Open.POST("/alarms-channels/send-test", core.Handle(alarm.ChannelSendTest))
		// mock
		v1Open.POST("/template/:id", core.Handle(template.Gen))
		v1Open.POST("/install", core.Handle(initialize.Install))
		v1Open.GET("/install", core.Handle(initialize.IsInstall))
		v1Open.POST("/open/bigdata/nodes/:id/run", core.Handle(bigdata.NodeRunOpenAPI))
	}
	admin := r.Group(apiPrefix + "/admin")
	{
		// non-authentication api
		admin.GET("/login/:oauth", core.Handle(user.Oauth))
		admin.POST("/users/login", core.Handle(user.Login))
	}
	v1 := r.Group(apiPrefix+"/v1", middlewares.AuthChecker())
	{
		// User related
		v1.GET("/users", core.Handle(user.List))
		v1.GET("/users/info", core.Handle(user.Info))
		v1.POST("/users/logout", core.Handle(user.Logout))
		v1.GET("/migration", core.Handle(initialize.Migration))
		v1.GET("/menus/list", core.Handle(permission.MenuList))
		v1.PATCH("/users/:uid/password", core.Handle(user.UpdatePassword))
		// Cluster configuration
		v1.POST("/sys/clusters", core.Handle(setting.ClusterCreate))
		v1.GET("/sys/clusters/:id", core.Handle(setting.ClusterInfo))
		v1.GET("/sys/clusters", core.Handle(setting.ClusterPageList))
		v1.PATCH("/sys/clusters/:id", core.Handle(setting.ClusterUpdate))
		v1.DELETE("/sys/clusters/:id", core.Handle(setting.ClusterDelete))
		// Configuration management
		v1.GET("/configurations", core.Handle(configure.List))
		v1.POST("/configurations", core.Handle(configure.Create))
		v1.GET("/configurations/:id", core.Handle(configure.Detail))
		v1.PATCH("/configurations/:id", core.Handle(configure.Update))
		v1.GET("/configurations/:id/diff", core.Handle(configure.Diff))
		v1.GET("/configurations/:id/lock", core.Handle(configure.Lock))
		v1.DELETE("/configurations/:id", core.Handle(configure.Delete))
		v1.POST("/configurations/:id/sync", core.Handle(configure.Sync))
		v1.POST("/configurations/:id/unlock", core.Handle(configure.Unlock))
		v1.POST("/configurations/:id/publish", core.Handle(configure.Publish))
		v1.GET("/configurations/:id/histories", core.Handle(configure.HistoryList))
		v1.GET("/configurations/:id/histories/:version", core.Handle(configure.HistoryInfo))
		// Cluster-related interfaces
		v1.GET("/clusters", core.Handle(kube.ClusterList))
		v1.GET("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapList))
		v1.POST("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapCreate))
		v1.GET("/clusters/:clusterId/namespace/:namespace/configmaps/:name", core.Handle(kube.ConfigMapInfo))
		// Instance
		v1.GET("/sys/instances", core.Handle(base.InstanceList))
		v1.POST("/sys/instances", core.Handle(base.InstanceCreate))
		v1.GET("/sys/instances/:id", core.Handle(base.InstanceInfo))
		v1.POST("/sys/instances/test", core.Handle(base.InstanceTest))
		v1.PATCH("/sys/instances/:id", core.Handle(base.InstanceUpdate))
		v1.DELETE("/sys/instances/:id", core.Handle(base.InstanceDelete))
		v1.GET("/instances/:iid/columns-self-built", core.Handle(base.TableColumnsSelfBuilt))
		// Database
		v1.PATCH("/databases/:id", core.Handle(base.DatabaseUpdate))
		v1.DELETE("/databases/:id", core.Handle(base.DatabaseDelete))
		v1.GET("/instances/:iid/databases", core.Handle(base.DatabaseList))
		v1.POST("/instances/:iid/databases", core.Handle(base.DatabaseCreate))
		v1.GET("/instances/:iid/databases-exist", core.Handle(base.DatabaseExistList))
		// Table
		v1.GET("/table/id", core.Handle(base.TableId))
		v1.GET("/tables/:id", core.Handle(base.TableInfo))
		v1.PATCH("/tables/:id", core.Handle(base.TableUpdate))
		v1.GET("/tables/:id/logs", core.Handle(base.TableLogs))
		v1.DELETE("/tables/:id", core.Handle(base.TableDelete))
		v1.GET("/tables/:id/charts", core.Handle(base.TableCharts))
		v1.GET("/databases/:did/tables", core.Handle(base.TableList))
		v1.POST("/databases/:did/tables", core.Handle(base.TableCreate))
		v1.GET("/instances/:iid/complete", core.Handle(base.QueryComplete))
		v1.POST("/instances/:iid/tables-exist", core.Handle(base.TableCreateSelfBuilt))
		v1.POST("/instances/:iid/tables-exist-batch", core.Handle(base.TableCreateSelfBuiltBatch))
		// hidden field
		v1.GET("/hidden/:tid", core.Handle(base.HiddenList))
		v1.POST("/hidden/:tid", core.Handle(base.HiddenUpsert))
		// analysis fields
		v1.GET("/tables/:id/indexes", core.Handle(base.Indexes))
		v1.PATCH("/tables/:id/indexes", core.Handle(base.IndexUpdate))
		v1.GET("/tables/:id/indexes/:idx", core.Handle(base.TableIndexes))
		// view
		v1.GET("/views/:id", core.Handle(base.ViewInfo))
		v1.PATCH("/views/:id", core.Handle(base.ViewUpdate))
		v1.DELETE("/views/:id", core.Handle(base.ViewDelete))
		v1.GET("/tables/:id/views", core.Handle(base.ViewList))
		v1.POST("/tables/:id/views", core.Handle(base.ViewCreate))
		// alarm
		v1.GET("/alarms", core.Handle(alarm.List))
		v1.POST("/alarms", core.Handle(alarm.Create))
		v1.GET("/alarms/:id", core.Handle(alarm.Info))
		v1.PATCH("/alarms/:id", core.Handle(alarm.Update))
		v1.DELETE("/alarms/:id", core.Handle(alarm.Delete))
		v1.GET("/alarms-channels", core.Handle(alarm.ChannelList))
		v1.GET("/alarms-histories", core.Handle(alarm.HistoryList))
		v1.POST("/alarms-channels", core.Handle(alarm.ChannelCreate))
		v1.GET("/alarms-channels/:id", core.Handle(alarm.ChannelInfo))
		v1.GET("/alarms-histories/:id", core.Handle(alarm.HistoryInfo))
		v1.PATCH("/alarms-channels/:id", core.Handle(alarm.ChannelUpdate))
		v1.DELETE("/alarms-channels/:id", core.Handle(alarm.ChannelDelete))
		// OpEvent Operation event interface
		v1.GET("/events", core.Handle(event.ListPage))
		v1.GET("/event/enums", core.Handle(event.GetAllEnums))
		v1.GET("/event/source/:name/enums", core.Handle(event.GetEnumsOfSource))
		// pms
		v1.GET("/pms/role", core.Handle(permission.PmsRoleList))
		v1.POST("/pms/role", core.Handle(permission.CreatePmsRole))
		v1.GET("/pms/role/:id", core.Handle(permission.PmsRoleInfo))
		v1.GET("/pms/root/uids", core.Handle(permission.GetRootUids))
		v1.PUT("/pms/role/:id", core.Handle(permission.UpdatePmsRole))
		v1.POST("/pms/check", core.Handle(permission.CheckPermission))
		v1.POST("/pms/root/grant", core.Handle(permission.GrantRootUids))
		v1.DELETE("/pms/role/:id", core.Handle(permission.DeletePmsRole))
		v1.GET("/pms/commonInfo", core.Handle(permission.GetPmsCommonInfo))
		v1.GET("/pms/instance/:iid/role/grant", core.Handle(permission.GetInstancePmsRolesGrant))
		v1.PUT("/pms/instance/:iid/role/grant", core.Handle(permission.UpdateInstancePmsRolesGrant))
		// bigdata
		v1.POST("/bigdata/folders", core.Handle(bigdata.FolderCreate))
		v1.GET("/bigdata/folders/:id", core.Handle(bigdata.FolderInfo))
		v1.PATCH("/bigdata/folders/:id", core.Handle(bigdata.FolderUpdate))
		v1.DELETE("/bigdata/folders/:id", core.Handle(bigdata.FolderDelete))
		// bigdata node
		v1.GET("/bigdata/nodes", core.Handle(bigdata.NodeList))
		v1.POST("/bigdata/nodes", core.Handle(bigdata.NodeCreate))
		v1.GET("/bigdata/nodes/:id", core.Handle(bigdata.NodeInfo))
		v1.POST("/bigdata/nodes/:id/run", core.Handle(bigdata.NodeRun))
		v1.PATCH("/bigdata/nodes/:id", core.Handle(bigdata.NodeUpdate))
		v1.DELETE("/bigdata/nodes/:id", core.Handle(bigdata.NodeDelete))
		v1.POST("/bigdata/nodes/:id/stop", core.Handle(bigdata.NodeStop))
		v1.GET("/instances/:iid/databases/:dn/tables/:tn/deps", core.Handle(base.TableDeps))
		// bigdata node history
		v1.GET("/bigdata/nodes/:id/histories", core.Handle(bigdata.NodeHistoryListPage))
		v1.GET("/bigdata/nodes/:id/histories/:uuid", core.Handle(bigdata.NodeHistoryInfo))
		// bigdata node result
		v1.GET("/bigdata/nodes/:id/result/:rid", core.Handle(bigdata.NodeResultInfo))
		// bigdata node lock
		v1.PATCH("/bigdata/nodes/:id/lock", core.Handle(bigdata.NodeLock))
		v1.PATCH("/bigdata/nodes/:id/unlock", core.Handle(bigdata.NodeUnlock))
		// source curl
		v1.GET("/bigdata/sources", core.Handle(bigdata.SourceList))
		v1.POST("/bigdata/sources", core.Handle(bigdata.SourceCreate))
		v1.GET("/bigdata/sources/:id", core.Handle(bigdata.SourceInfo))
		v1.PATCH("/bigdata/sources/:id", core.Handle(bigdata.SourceUpdate))
		v1.DELETE("/bigdata/sources/:id", core.Handle(bigdata.SourceDelete))
		// source table struct
		v1.GET("/bigdata/mining/sources/:id/tables", core.Handle(bigdata.SourceTableList))
		v1.GET("/bigdata/mining/sources/:id/columns", core.Handle(bigdata.SourceColumnList))
		v1.GET("/bigdata/mining/sources/:id/databases", core.Handle(bigdata.SourceDatabaseList))
		// inner clickhouse source table struct
		v1.GET("/bigdata/mining/instances/:id/tables", core.Handle(bigdata.InstanceTableList))
		v1.GET("/bigdata/mining/instances/:id/columns", core.Handle(bigdata.InstanceColumnList))
		v1.GET("/bigdata/mining/instances/:id/databases", core.Handle(bigdata.InstanceDatabaseList))
		// data mining workflows
		v1.GET("/bigdata/mining/workflows", core.Handle(mining.WorkflowList))
		v1.POST("/bigdata/mining/workflows", core.Handle(mining.WorkflowCreate))
		v1.GET("/bigdata/mining/workflows/:id", core.Handle(mining.WorkflowInfo))
		v1.PATCH("/bigdata/mining/workflows/:id", core.Handle(mining.WorkflowUpdate))
		v1.DELETE("/bigdata/mining/workflows/:id", core.Handle(mining.WorkflowDelete))
		// data mining crontab
		v1.GET("/bigdata/mining/nodes/:id/crontab", core.Handle(mining.CrontabInfo))
		v1.DELETE("/bigdata/mining/nodes/:id/crontab", core.Handle(mining.CrontabDelete))
	}

	// Defines interface prefixes in terms of module overrides：
	// The global basic readable information module - base
	// The log module - storage
	// The alarm module - alarm
	// The data analysis module - pandas
	// The configuration module - cmdb
	// The system management module - sysop
	v2 := r.Group(apiPrefix+"/v2", middlewares.AuthChecker())
	// swagger docs
	{
		v2.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	}
	// The global basic readable information module - base
	{
		v2.GET("/base/instances", core.Handle(basev2.InstanceList))
	}
	// The data analysis module - pandas
	{
		// The edit lock can be actively obtained if the file is in the edit state
		v2.POST("/pandas/nodes/:node-id/lock-acquire", core.Handle(pandas.NodeLockAcquire))
		// Scheduled Task Scheduling
		v2.POST("/pandas/nodes/:node-id/crontab", core.Handle(pandas.NodeCrontabCreate))
		v2.PATCH("/pandas/nodes/:node-id/crontab", core.Handle(pandas.NodeCrontabUpdate))
		// The node running data is processed by Excel
		v2.PATCH("/pandas/nodes-results/:result-id", core.Handle(pandas.NodeResultUpdate))
		v2.GET("/pandas/nodes/:node-id/results", core.Handle(pandas.NodeResultListPage))
	}
	// The log module - storage
	{
		v2.POST("/storage", core.Handle(storage.Create))
		v2.POST("/storage/mapping-json", core.Handle(storage.KafkaJsonMapping))
	}
	return r
}
