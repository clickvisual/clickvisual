package base

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// ShortURLRedirect  godoc
// @Summary      Get short links
// @Description  Get short links
// @Tags         base
// @Produce      json
// @Param        s-code path int true "short code"
// @Success      301 {string} ok
// @Router       /api/v2/base/su/{s-code} [get]
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
		invoker.Logger.Error("update call cnt error", elog.FieldErr(err))
		return
	}
	c.Redirect(301, shortUrl.OriginUrl)
	return
}

// ShortURLCreate  godoc
// @Summary      Create short links
// @Description  Create short links
// @Tags         base
// @Produce      json
// @Param        req body view.ReqShortURLCreate true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/base/shorturls [post]
func ShortURLCreate(c *core.Context) {
	var req view.ReqShortURLCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	shortUrl := db.BaseShortURL{
		OriginUrl: req.OriginUrl,
		SCode:     "",
		CallCnt:   0,
	}
	tx := invoker.Db.Begin()
	if err := db.ShortURLCreate(tx, &shortUrl); err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	sCode := service.HashIDGenCode(shortUrl.ID)
	if err := db.ShortURLUpdate(tx, shortUrl.ID, map[string]interface{}{"s_code": sCode}); err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err := tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	rootUrl := strings.TrimSuffix(econf.GetString("app.rootURL"), "/")
	c.JSONOK(fmt.Sprintf("%s/api/v2/base/su/%s", rootUrl, sCode))
	return
}
