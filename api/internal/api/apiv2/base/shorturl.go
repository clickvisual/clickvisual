package base

import (
	"context"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service/shorturl"
)

// ShortURLRedirect
// @Summary      获取短链接
// @Tags         LOGSTORE
func ShortURLRedirect(c *core.Context) {
	sCode := strings.TrimSpace(c.Param("s-code"))
	if sCode == "" {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	shortUrl, err := db.ShortURLInfoBySCode(invoker.Db, sCode)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = invoker.Db.WithContext(context.Background()).
		Exec("update cv_base_short_url set call_cnt = call_cnt+1, utime = ? where s_code = ?", time.Now().Unix(), sCode).Error; err != nil {
		elog.Error("update call cnt error", elog.FieldErr(err))
		return
	}
	c.Redirect(301, shortUrl.OriginUrl)
}

// ShortURLCreate  godoc
// @Summary      Create short links
// @Description  Create short links
// @Tags         LOGSTORE
// @Produce      json
// @Param        req body db.ReqShortURLCreate true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/base/shorturls [post]
func ShortURLCreate(c *core.Context) {
	var req db.ReqShortURLCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	res, err := shorturl.GenShortURL(req.OriginUrl)
	if err != nil {
		c.JSONE(1, "gen short url error: "+err.Error(), err)
		return
	}
	c.JSONOK(res)
}
