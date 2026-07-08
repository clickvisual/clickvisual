package router

import (
	_ "embed"

	"github.com/gin-gonic/gin"

	goredoc "github.com/link-duan/go-redoc"

	"github.com/clickvisual/clickvisual/api/docs"
	aiv2 "github.com/clickvisual/clickvisual/api/internal/api/apiv2/ai"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/alert"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/base"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/pandas"
	queryv2 "github.com/clickvisual/clickvisual/api/internal/api/apiv2/query"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/report"
	"github.com/clickvisual/clickvisual/api/internal/api/apiv2/storage"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
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
	if config.IsPrivateLiteMode() {
		v2PrivateLite(r)
		return
	}
	v2Full(r)
}

func v2Full(r *gin.RouterGroup) {
	// swagger docs
	{
		r.GET("/swagger/*any", goredoc.GinHandler(&goredoc.Setting{
			OpenAPIJson: docs.EGOGenAPI,
			UriPrefix:   "/api/v2/swagger",
			Title:       "Go ReDoc",
			RedocOptions: map[string]string{
				"schema-expansion-level": "all",
				"expand-responses":       "200,201",
			},
		}))
	}
	// The global basic readable information module - base
	{
		// user apis
		r.GET("/base/users", core.Handle(base.ListUser))
		r.POST("/base/users", core.Handle(base.CreateUser))
		r.PATCH("/base/users/:user-id", core.Handle(base.UpdateUser))
		r.DELETE("/base/users/:user-id", core.Handle(base.DeleteUser))
		r.PATCH("/base/users/:user-id/password-reset", core.Handle(base.ResetUserPassword))
		// other apis
		r.GET("/base/instances", core.Handle(base.InstanceList))
		r.POST("/base/system/schema-sync", core.Handle(base.SystemSchemaSync))
		r.GET("/base/settings/instances", core.Handle(base.SettingsInstanceList))
		r.GET("/base/settings/instances/:instance-id", core.Handle(base.SettingsInstanceInfo))
		r.POST("/base/settings/instances", core.Handle(base.SettingsInstanceCreate))
		r.PATCH("/base/settings/instances/:instance-id", core.Handle(base.SettingsInstanceUpdate))
		r.DELETE("/base/settings/instances/:instance-id", core.Handle(base.SettingsInstanceDelete))
		r.POST("/base/settings/instances/test", core.Handle(base.SettingsInstanceTest))
		r.GET("/base/settings/ai", core.Handle(base.SettingsAIInfo))
		r.PATCH("/base/settings/ai", core.Handle(base.SettingsAIUpdate))
		r.POST("/base/settings/ai/test", core.Handle(base.SettingsAITest))
		r.GET("/base/settings/alarm-channels", core.Handle(base.SettingsAlarmChannelList))
		r.GET("/base/settings/alarm-channels/:channel-id", core.Handle(base.SettingsAlarmChannelInfo))
		r.POST("/base/settings/alarm-channels", core.Handle(base.SettingsAlarmChannelCreate))
		r.PATCH("/base/settings/alarm-channels/:channel-id", core.Handle(base.SettingsAlarmChannelUpdate))
		r.DELETE("/base/settings/alarm-channels/:channel-id", core.Handle(base.SettingsAlarmChannelDelete))
		r.POST("/base/settings/alarm-channels/send-test", core.Handle(base.SettingsAlarmChannelSendTest))
		// todo: deprecated
		r.POST("/base/shorturls", core.Handle(base.ShortURLCreate))
		r.GET("/base/su/:s-code", core.Handle(base.ShortURLRedirect))
		// instance
		r.GET("/base/install/local", core.Handle(base.ListUser))
	}
	// The data analysis module - pandas
	{
		// The edit lock can be actively obtained if the file is in the edit state
		r.POST("/pandas/nodes/:node-id/lock-acquire", core.Handle(pandas.NodeLockAcquire))
		// Scheduled Task Scheduling
		r.POST("/pandas/nodes/:node-id/crontab", core.Handle(pandas.NodeCrontabCreate))
		r.PATCH("/pandas/nodes/:node-id/crontab", core.Handle(pandas.NodeCrontabUpdate))
		// The node running data is processed by Excel
		r.GET("/pandas/nodes/:node-id/results", core.Handle(pandas.NodeResultListPage))
		r.PATCH("/pandas/nodes-results/:result-id", core.Handle(pandas.NodeResultUpdate))
		// Timing schedule stats
		r.GET("/pandas/workers", core.Handle(pandas.WorkerList))
		r.GET("/pandas/workers/dashboard", core.Handle(pandas.WorkerDashboard))
		r.GET("/pandas/instances/:instance-id/table-dependencies", core.Handle(pandas.TableDependencies))
		// DDL structural transfer
		r.POST("/pandas/utils/structural-transfer", core.Handle(pandas.StructuralTransfer))
		// TableName Create SQL
		r.GET("/pandas/instances/:instance-id/databases/:database/tables/:table/create-sql", core.Handle(pandas.TableCreateSQL))
	}
	// The query module - query
	{
		r.POST("/ai/run", core.Handle(aiv2.Run))
	}
	// The query module - query
	{
		r.GET("/query/filters", core.Handle(queryv2.List))
		r.GET("/query/filters/:filter-id", core.Handle(queryv2.Get))
		r.POST("/query/filters", core.Handle(queryv2.Create))
		r.PUT("/query/filters/:filter-id", core.Handle(queryv2.Update))
		r.DELETE("/query/filters/:filter-id", core.Handle(queryv2.Delete))
		r.GET("/query/instances/:instance-id/databases/:database/tables", core.Handle(queryv2.SourceTables))
		r.POST("/query/ingestion/detect", core.Handle(queryv2.Detect))
		r.POST("/query/ingestion/fields", core.Handle(queryv2.Fields))
		r.POST("/query/ingestion/publish-draft", core.Handle(queryv2.PublishDraft))
		r.POST("/query/ingestion/publish", core.Handle(queryv2.Publish))
		r.POST("/query/compile", core.Handle(queryv2.Compile))
		r.POST("/query/run", core.Handle(queryv2.Run))
		r.POST("/query/field-stats", core.Handle(queryv2.FieldStats))
		r.GET("/query/tokens", core.Handle(queryv2.TokenList))
		r.POST("/query/tokens", core.Handle(queryv2.TokenCreate))
		r.PATCH("/query/tokens/:token-id", core.Handle(queryv2.TokenUpdate))
		r.PUT("/query/tokens/:token-id/grants", core.Handle(queryv2.TokenGrantUpdate))
		r.GET("/query/tokens/:token-id/audits", core.Handle(queryv2.TokenAuditList))
	}
	// The log module - storage
	{
		r.POST("/storage", core.Handle(storage.Create))
		r.PATCH("/storage/:storage-id", core.Handle(storage.Update))
		r.POST("/storage/mapping-json", core.Handle(storage.KafkaJsonMapping))
		r.POST("/storage/:template", core.Handle(storage.CreateStorageByTemplate))
		r.GET("/storage/:storage-id/analysis-fields", core.Handle(storage.AnalysisFields))
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
		r.POST("/alert/metrics-samples", core.Handle(alert.CreateMetricsSamples))
		r.PATCH("/alert/settings/:instance-id", core.Handle(alert.SettingUpdate))
	}
	// The report module - report
	{
		r.POST("/reports", core.Handle(report.ReportUpsert))
		r.GET("/reports/:report-id", core.Handle(report.ReportGet))
		r.DELETE("/reports/:report-id", core.Handle(report.ReportDelete))
		r.GET("/reports/list", core.Handle(report.ReportList))
		r.GET("/reports/editor", core.Handle(report.EditorGet))
		r.GET("/reports/delivery", core.Handle(report.DeliveryGet))
		r.GET("/reports/channels", core.Handle(report.ChannelList))
		r.GET("/reports/preview", core.Handle(report.PreviewGet))
		r.POST("/reports/preview-run", core.Handle(report.PreviewRun))
		r.POST("/reports/acceleration/check-run", core.Handle(report.AccelerationCheckRun))
		r.POST("/reports/where-check", core.Handle(report.WhereCheckRun))
		r.GET("/reports/executions", core.Handle(report.ExecutionList))
		r.GET("/reports/results", core.Handle(report.ResultGet))
		r.GET("/reports/workspace", core.Handle(report.WorkspaceGet))
		r.GET("/reports/instances", core.Handle(report.ReportSourceInstances))
		r.GET("/reports/instances/:instance-id/databases", core.Handle(report.ReportSourceDatabases))
		r.GET("/reports/instances/:instance-id/databases/:database/tables", core.Handle(report.ReportSourceTables))
		r.GET("/reports/instances/:instance-id/databases/:database/tables/:table/columns", core.Handle(report.ReportTableColumns))
		r.POST("/reports/configs", core.Handle(report.ConfigUpsert))
		r.GET("/reports/configs/:node-id", core.Handle(report.ConfigGet))
	}
}

func v2PrivateLite(r *gin.RouterGroup) {
	// Minimal base reads required by the v2 query workbench.
	{
		r.GET("/base/instances", core.Handle(base.InstanceList))
		r.GET("/base/settings/instances", core.Handle(base.SettingsInstanceList))
		r.GET("/base/settings/instances/:instance-id", core.Handle(base.SettingsInstanceInfo))
	}
	// Log query APIs. Log table creation stays outside HTTP in private-lite mode and is driven by `clickvisual ego`.
	{
		r.GET("/query/filters", core.Handle(queryv2.List))
		r.GET("/query/filters/:filter-id", core.Handle(queryv2.Get))
		r.POST("/query/filters", core.Handle(queryv2.Create))
		r.PUT("/query/filters/:filter-id", core.Handle(queryv2.Update))
		r.DELETE("/query/filters/:filter-id", core.Handle(queryv2.Delete))
		r.GET("/query/instances/:instance-id/databases/:database/tables", core.Handle(queryv2.SourceTables))
		r.POST("/query/compile", core.Handle(queryv2.Compile))
		r.POST("/query/run", core.Handle(queryv2.Run))
		r.POST("/query/field-stats", core.Handle(queryv2.FieldStats))
		r.GET("/query/tokens", core.Handle(queryv2.TokenList))
		r.POST("/query/tokens", core.Handle(queryv2.TokenCreate))
		r.PATCH("/query/tokens/:token-id", core.Handle(queryv2.TokenUpdate))
		r.PUT("/query/tokens/:token-id/grants", core.Handle(queryv2.TokenGrantUpdate))
		r.GET("/query/tokens/:token-id/audits", core.Handle(queryv2.TokenAuditList))
	}
}
