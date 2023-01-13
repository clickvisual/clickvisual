package base

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
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
	return
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
	u, err := url.Parse(req.OriginUrl)
	if err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	v := url.Values{}
	v = u.Query()
	v.Set("tab", "custom")
	u2 := fmt.Sprintf("%s://%s%s?%s", u.Scheme, u.Host, u.Path, v.Encode())
	shortUrl := db.BaseShortURL{
		OriginUrl: u2,
		SCode:     "",
		CallCnt:   0,
	}
	tx := invoker.Db.Begin()
	if err = db.ShortURLCreate(tx, &shortUrl); err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	sCode := service.HashIDGenCode(shortUrl.ID)
	if err = db.ShortURLUpdate(tx, shortUrl.ID, map[string]interface{}{"s_code": sCode}); err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	rootUrl := strings.TrimSuffix(econf.GetString("app.rootURL"), "/")
	res := fmt.Sprintf("%s/api/share/%s", rootUrl, sCode)
	c.JSONOK(res)
	return
}
