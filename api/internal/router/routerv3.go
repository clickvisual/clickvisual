package router

import (
	"github.com/gin-gonic/gin"

	"github.com/clickvisual/clickvisual/api/internal/middlewares"

	"github.com/clickvisual/clickvisual/api/internal/api/apiv3/storage"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

// Defines interface prefixes in terms of module overrides：
// The global basic readable information module - base
// The log module - storage
// The alarm module - alarm
// The data analysis module - pandas
// The configuration module - cmdb
// The system management module - sysop
func v3(r *gin.RouterGroup) {
	r = r.Group("/api/v3", middlewares.AuthChecker())

	// The log module - storage
	{
		r.POST("/storage", core.Handle(storage.Create))
	}
}
