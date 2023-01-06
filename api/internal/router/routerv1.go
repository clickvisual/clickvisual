package router

import (
	"github.com/gin-gonic/gin"

	"github.com/clickvisual/clickvisual/api/internal/middlewares"

	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/alarm"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/base"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/bigdata"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/bigdata/mining"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/configure"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/event"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/initialize"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/kube"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/permission"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/setting"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv1/user"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

func v1(r *gin.RouterGroup) {
	r = r.Group("/api/v1", middlewares.AuthChecker())

	// User related
	r.GET("/users", core.Handle(user.List))
	r.GET("/users/info", core.Handle(user.Info))
	r.POST("/users/logout", core.Handle(user.Logout))
	r.GET("/migration", core.Handle(initialize.Migration))
	r.GET("/menus/list", core.Handle(permission.MenuList))
	r.PATCH("/users/:uid/password", core.Handle(user.UpdatePassword))
	// Cluster configuration
	r.POST("/sys/clusters", core.Handle(setting.ClusterCreate))
	r.GET("/sys/clusters/:id", core.Handle(setting.ClusterInfo))
	r.GET("/sys/clusters", core.Handle(setting.ClusterPageList))
	r.PATCH("/sys/clusters/:id", core.Handle(setting.ClusterUpdate))
	r.DELETE("/sys/clusters/:id", core.Handle(setting.ClusterDelete))
	// Configuration management
	r.GET("/configurations", core.Handle(configure.List))
	r.POST("/configurations", core.Handle(configure.Create))
	r.GET("/configurations/:id", core.Handle(configure.Detail))
	r.PATCH("/configurations/:id", core.Handle(configure.Update))
	r.GET("/configurations/:id/diff", core.Handle(configure.Diff))
	r.GET("/configurations/:id/lock", core.Handle(configure.Lock))
	r.DELETE("/configurations/:id", core.Handle(configure.Delete))
	r.POST("/configurations/:id/sync", core.Handle(configure.Sync))
	r.POST("/configurations/:id/unlock", core.Handle(configure.Unlock))
	r.POST("/configurations/:id/publish", core.Handle(configure.Publish))
	r.GET("/configurations/:id/histories", core.Handle(configure.HistoryList))
	r.GET("/configurations/:id/histories/:version", core.Handle(configure.HistoryInfo))
	// Cluster-related interfaces
	r.GET("/clusters", core.Handle(kube.ClusterList))
	r.GET("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapList))
	r.POST("/clusters/:clusterId/configmaps", core.Handle(kube.ConfigMapCreate))
	r.GET("/clusters/:clusterId/namespace/:namespace/configmaps/:name", core.Handle(kube.ConfigMapInfo))
	// Instance
	r.GET("/sys/instances", core.Handle(base.InstanceList))
	r.POST("/sys/instances", core.Handle(base.InstanceCreate))
	r.GET("/sys/instances/:id", core.Handle(base.InstanceInfo))
	r.POST("/sys/instances/test", core.Handle(base.InstanceTest))
	r.PATCH("/sys/instances/:id", core.Handle(base.InstanceUpdate))
	r.DELETE("/sys/instances/:id", core.Handle(base.InstanceDelete))
	r.GET("/instances/:iid/columns-self-built", core.Handle(base.TableColumnsSelfBuilt))
	// Database
	r.PATCH("/databases/:id", core.Handle(base.DatabaseUpdate))
	r.DELETE("/databases/:id", core.Handle(base.DatabaseDelete))
	r.GET("/instances/:iid/databases", core.Handle(base.DatabaseList))
	r.POST("/instances/:iid/databases", core.Handle(base.DatabaseCreate))
	r.GET("/instances/:iid/databases-exist", core.Handle(base.DatabaseExistList))
	// Table
	r.GET("/table/id", core.Handle(base.TableId))
	r.GET("/tables/:id", core.Handle(base.TableInfo))
	r.PATCH("/tables/:id", core.Handle(base.TableUpdate))
	r.GET("/tables/:id/logs", core.Handle(base.TableLogs))
	r.DELETE("/tables/:id", core.Handle(base.TableDelete))
	r.GET("/tables/:id/charts", core.Handle(base.TableCharts))
	r.GET("/databases/:did/tables", core.Handle(base.TableList))
	r.POST("/databases/:did/tables", core.Handle(base.TableCreate))
	r.GET("/instances/:iid/complete", core.Handle(base.QueryComplete))
	r.POST("/instances/:iid/tables-exist", core.Handle(base.TableCreateSelfBuilt))
	r.POST("/instances/:iid/tables-exist-batch", core.Handle(base.TableCreateSelfBuiltBatch))
	// hidden field
	r.GET("/hidden/:tid", core.Handle(base.HiddenList))
	r.POST("/hidden/:tid", core.Handle(base.HiddenUpsert))
	// analysis fields
	r.GET("/tables/:id/indexes", core.Handle(base.Indexes))
	r.PATCH("/tables/:id/indexes", core.Handle(base.IndexUpdate))
	r.GET("/tables/:id/indexes/:idx", core.Handle(base.TableIndexes))
	// view
	r.GET("/views/:id", core.Handle(base.ViewInfo))
	r.PATCH("/views/:id", core.Handle(base.ViewUpdate))
	r.DELETE("/views/:id", core.Handle(base.ViewDelete))
	r.GET("/tables/:id/views", core.Handle(base.ViewList))
	r.POST("/tables/:id/views", core.Handle(base.ViewCreate))
	// alarm
	r.GET("/alarms", core.Handle(alarm.List))
	r.POST("/alarms-channels/send-test", core.Handle(alarm.ChannelSendTest)) // alarms send test
	r.POST("/alarms", core.Handle(alarm.Create))
	r.GET("/alarms/:id", core.Handle(alarm.Info))
	r.PATCH("/alarms/:id", core.Handle(alarm.Update))
	r.DELETE("/alarms/:id", core.Handle(alarm.Delete))
	r.GET("/alarms-channels", core.Handle(alarm.ChannelList))
	r.GET("/alarms-histories", core.Handle(alarm.HistoryList))
	r.POST("/alarms-channels", core.Handle(alarm.ChannelCreate))
	r.GET("/alarms-channels/:id", core.Handle(alarm.ChannelInfo))
	r.GET("/alarms-histories/:id", core.Handle(alarm.HistoryInfo))
	r.PATCH("/alarms-channels/:id", core.Handle(alarm.ChannelUpdate))
	r.DELETE("/alarms-channels/:id", core.Handle(alarm.ChannelDelete))
	// OpEvent Operation event interface
	r.GET("/events", core.Handle(event.ListPage))
	r.GET("/event/enums", core.Handle(event.GetAllEnums))
	r.GET("/event/source/:name/enums", core.Handle(event.GetEnumsOfSource))
	// pms
	r.GET("/pms/role", core.Handle(permission.PmsRoleList))
	r.POST("/pms/role", core.Handle(permission.CreatePmsRole))
	r.GET("/pms/role/:id", core.Handle(permission.PmsRoleInfo))
	r.GET("/pms/root/uids", core.Handle(permission.GetRootUids))
	r.PUT("/pms/role/:id", core.Handle(permission.UpdatePmsRole))
	r.POST("/pms/check", core.Handle(permission.CheckPermission))
	r.POST("/pms/root/grant", core.Handle(permission.GrantRootUids))
	r.DELETE("/pms/role/:id", core.Handle(permission.DeletePmsRole))
	r.GET("/pms/commonInfo", core.Handle(permission.GetPmsCommonInfo))
	r.GET("/pms/instance/:iid/role/grant", core.Handle(permission.GetInstancePmsRolesGrant))
	r.PUT("/pms/instance/:iid/role/grant", core.Handle(permission.UpdateInstancePmsRolesGrant))
	// bigdata
	r.POST("/bigdata/folders", core.Handle(bigdata.FolderCreate))
	r.GET("/bigdata/folders/:id", core.Handle(bigdata.FolderInfo))
	r.PATCH("/bigdata/folders/:id", core.Handle(bigdata.FolderUpdate))
	r.DELETE("/bigdata/folders/:id", core.Handle(bigdata.FolderDelete))
	// bigdata node
	r.GET("/bigdata/nodes", core.Handle(bigdata.NodeList))
	r.POST("/bigdata/nodes", core.Handle(bigdata.NodeCreate))
	r.GET("/bigdata/nodes/:id", core.Handle(bigdata.NodeInfo))
	r.POST("/bigdata/nodes/:id/run", core.Handle(bigdata.NodeRun))
	r.PATCH("/bigdata/nodes/:id", core.Handle(bigdata.NodeUpdate))
	r.DELETE("/bigdata/nodes/:id", core.Handle(bigdata.NodeDelete))
	r.POST("/bigdata/nodes/:id/stop", core.Handle(bigdata.NodeStop))
	r.GET("/instances/:iid/databases/:dn/tables/:tn/deps", core.Handle(base.TableDeps))
	// bigdata node history
	r.GET("/bigdata/nodes/:id/histories", core.Handle(bigdata.NodeHistoryListPage))
	r.GET("/bigdata/nodes/:id/histories/:uuid", core.Handle(bigdata.NodeHistoryInfo))
	// bigdata node result
	r.GET("/bigdata/nodes/:id/result/:rid", core.Handle(bigdata.NodeResultInfo))
	// bigdata node lock
	r.PATCH("/bigdata/nodes/:id/lock", core.Handle(bigdata.NodeLock))
	r.PATCH("/bigdata/nodes/:id/unlock", core.Handle(bigdata.NodeUnlock))
	// source curl
	r.GET("/bigdata/sources", core.Handle(bigdata.SourceList))
	r.POST("/bigdata/sources", core.Handle(bigdata.SourceCreate))
	r.GET("/bigdata/sources/:id", core.Handle(bigdata.SourceInfo))
	r.PATCH("/bigdata/sources/:id", core.Handle(bigdata.SourceUpdate))
	r.DELETE("/bigdata/sources/:id", core.Handle(bigdata.SourceDelete))
	// source table struct
	r.GET("/bigdata/mining/sources/:id/tables", core.Handle(bigdata.SourceTableList))
	r.GET("/bigdata/mining/sources/:id/columns", core.Handle(bigdata.SourceColumnList))
	r.GET("/bigdata/mining/sources/:id/databases", core.Handle(bigdata.SourceDatabaseList))
	// inner clickhouse source table struct
	r.GET("/bigdata/mining/instances/:id/tables", core.Handle(bigdata.InstanceTableList))
	r.GET("/bigdata/mining/instances/:id/columns", core.Handle(bigdata.InstanceColumnList))
	r.GET("/bigdata/mining/instances/:id/databases", core.Handle(bigdata.InstanceDatabaseList))
	// data mining workflows
	r.GET("/bigdata/mining/workflows", core.Handle(mining.WorkflowList))
	r.POST("/bigdata/mining/workflows", core.Handle(mining.WorkflowCreate))
	r.GET("/bigdata/mining/workflows/:id", core.Handle(mining.WorkflowInfo))
	r.PATCH("/bigdata/mining/workflows/:id", core.Handle(mining.WorkflowUpdate))
	r.DELETE("/bigdata/mining/workflows/:id", core.Handle(mining.WorkflowDelete))
	// data mining crontab
	r.GET("/bigdata/mining/nodes/:id/crontab", core.Handle(mining.CrontabInfo))
	r.DELETE("/bigdata/mining/nodes/:id/crontab", core.Handle(mining.CrontabDelete))
}
