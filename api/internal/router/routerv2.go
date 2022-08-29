package router

import (
	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/clickvisual/clickvisual/api/internal/apiv2/base"
	"github.com/clickvisual/clickvisual/api/internal/apiv2/pandas"
	"github.com/clickvisual/clickvisual/api/internal/apiv2/storage"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

// Defines interface prefixes in terms of module overrides：
// The global basic readable information module - base
// The log module - storage
// The alarm module - alarm
// The data analysis module - pandas
// The configuration module - cmdb
// The system management module - sysop
func v2(r *gin.RouterGroup) {
	// swagger docs
	{
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	}
	// The global basic readable information module - base
	{
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
	}
	// The log module - storage
	{
		r.POST("/storage", core.Handle(storage.Create))
		r.POST("/storage/mapping-json", core.Handle(storage.KafkaJsonMapping))
		r.GET("/storage/:storage-id/analysis-fields", core.Handle(storage.AnalysisFields))
		r.PATCH("/storage/:storage-id", core.Handle(storage.Update))
	}
}
