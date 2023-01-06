package router

import (
	_ "embed"

	"github.com/gin-gonic/gin"

	goredoc "github.com/link-duan/go-redoc"

	"github.com/clickvisual/clickvisual/api/docs"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/alert"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/base"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/pandas"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/storage"
	"github.com/clickvisual/clickvisual/api/internal/middlewares"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

// Defines interface prefixes in terms of module overrides：
// The global basic readable information module - base
// The log module - storage
// The alert module - alert
// The data analysis module - pandas
// The configuration module - cmdb
// The system management module - sysop
func v2(r *gin.RouterGroup) {
	r = r.Group("/api/v2", middlewares.AuthChecker())
	// swagger docs
	{
		r.GET("/swagger/*any", goredoc.GinHandler(&goredoc.Setting{
			OpenAPIJson: docs.EGOGenAPI,
			UriPrefix:   "/api/v2/swagger",
			Title:       "Go Redoc",
			RedocOptions: map[string]string{
				"schema-expansion-level": "all",
				"expand-responses":       "200,201",
			},
		}))
	}
	// The global basic readable information module - base
	{
		// user apis
		r.GET("/base/users", core.Handle(base.UserList))
		r.POST("/base/users", core.Handle(base.UserCreate))
		r.PATCH("/base/users/:user-id/password-reset", core.Handle(base.UserPasswordReset))
		r.DELETE("/base/users/:user-id", core.Handle(base.UserDelete))
		// other apis
		r.GET("/base/instances", core.Handle(base.InstanceList))
		r.GET("/base/su/:s-code", core.Handle(base.ShortURLRedirect))
		r.POST("/base/shorturls", core.Handle(base.ShortURLCreate))
	}
	// The data analysis module - pandas
	{
		// The edit lock can be actively obtained if the file is in the edit state
		r.POST("/pandas/nodes/:node-id/lock-acquire", core.Handle(pandas.NodeLockAcquire))
		// Scheduled Task Scheduling
		r.POST("/pandas/nodes/:node-id/crontab", core.Handle(pandas.NodeCrontabCreate))
		r.PATCH("/pandas/nodes/:node-id/crontab", core.Handle(pandas.NodeCrontabUpdate))
		// The node running data is processed by Excel
		r.PATCH("/pandas/nodes-results/:result-id", core.Handle(pandas.NodeResultUpdate))
		r.GET("/pandas/nodes/:node-id/results", core.Handle(pandas.NodeResultListPage))
		// Timing schedule stats
		r.GET("/pandas/workers", core.Handle(pandas.WorkerList))
		r.GET("/pandas/workers/dashboard", core.Handle(pandas.WorkerDashboard))
		r.GET("/pandas/instances/:instance-id/table-dependencies", core.Handle(pandas.TableDependencies))
		// DDL structural transfer
		r.POST("/pandas/utils/structural-transfer", core.Handle(pandas.StructuralTransfer))
		// Table Create SQL
		r.GET("/pandas/instances/:instance-id/databases/:database/tables/:table/create-sql", core.Handle(pandas.TableCreateSQL))
	}
	// The log module - storage
	{
		r.POST("/storage", core.Handle(storage.Create))
		r.POST("/storage/:template", core.Handle(storage.CreateStorageByTemplate))
		r.POST("/storage/mapping-json", core.Handle(storage.KafkaJsonMapping))
		r.GET("/storage/:storage-id/analysis-fields", core.Handle(storage.AnalysisFields))
		r.PATCH("/storage/:storage-id", core.Handle(storage.Update))
		// trace apis
		r.GET("/storage/traces", core.Handle(storage.GetTraceList))
		r.PATCH("/storage/:storage-id/trace", core.Handle(storage.UpdateTraceInfo))
		r.GET("/storage/:storage-id/trace-graph", core.Handle(storage.GetTraceGraph))
		r.GET("/storage/:storage-id/columns", core.Handle(storage.GetStorageColumns))
		// collect
		r.GET("/storage/collects", core.Handle(storage.ListCollect))
		r.POST("/storage/collects", core.Handle(storage.CreateCollect))
		r.PATCH("/storage/collects/:collect-id", core.Handle(storage.UpdateCollect))
		r.DELETE("/storage/collects/:collect-id", core.Handle(storage.DeleteCollect))
	}
	// The log module - alert
	{
		r.GET("/alert/settings", core.Handle(alert.SettingList))
		r.GET("/alert/settings/:instance-id", core.Handle(alert.SettingInfo))
		r.PATCH("/alert/settings/:instance-id", core.Handle(alert.SettingUpdate))
		r.POST("/alert/metrics-samples", core.Handle(alert.CreateMetricsSamples))
	}
}
