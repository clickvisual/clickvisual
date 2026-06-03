package ai

import (
	"context"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	aisvc "github.com/clickvisual/clickvisual/api/internal/service/ai"
)

// Run godoc
// @Summary      运行统一 AI 场景
// @Tags         AI
// @Accept       json
// @Produce      json
// @Router       /api/v2/ai/run [post]
func Run(c *core.Context) {
	var req view.ReqAIRun
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := aisvc.Run(context.Background(), req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}
