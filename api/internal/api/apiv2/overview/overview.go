package overview

import (
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/service/overview"
)

// Summary godoc
// @Summary      Overview dashboard summary
// @Description  Aggregates log ingestion, alarm and report statistics from metadata for the v2 overview page
// @Tags         OVERVIEW
// @Produce      json
// @Success      200  {object}  view.RespOverviewSummary
// @Router       /api/v2/overview/summary [get]
func Summary(c *core.Context) {
	res, err := overview.Summary(c.Uid(), time.Now())
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
}
