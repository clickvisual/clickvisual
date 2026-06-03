package query

import (
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	reportservice "github.com/clickvisual/clickvisual/api/internal/service/report"
)

// SourceTables godoc
// @Summary      获取实例数据库下的已有表
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/instances/{instance-id}/databases/{database}/tables [get]
func SourceTables(c *core.Context) {
	instanceID := cast.ToInt(c.Param("instance-id"))
	database := c.Param("database")
	resp, err := reportservice.ListSourceTables(instanceID, database)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}
