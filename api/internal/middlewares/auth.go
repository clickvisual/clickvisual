package middlewares

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kauth"

	"github.com/shimohq/mogo/api/pkg/component/core"

	"github.com/shimohq/mogo/api/pkg/model/db"
)

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {
		if econf.GetBool("debug") {
			mockUser := &db.User{
				Username: "admin",
				Nickname: "admin",
				BaseModel: db.BaseModel{
					ID: 777,
				},
			}
			session := sessions.Default(c)
			session.Set("user", mockUser)
			_ = session.Save()
		}
		session := sessions.Default(c)
		user := session.Get("user")
		if user == nil {
			elog.Info("AuthChecker", elog.Any("step", "Get"), elog.Any("user", user))
			appURL, _, _ := kauth.ParseAppAndSubURL(econf.GetString("app.rootURL"))
			appURL = strings.ReplaceAll(appURL, "9001", "8000")
			c.JSON(http.StatusOK, core.Res{Code: 302, Data: appURL + "login", Msg: "找不到指定token信息(#1)"})
			c.Abort()
			return
		}
		tmp, _ := json.Marshal(user)
		u := db.User{}
		_ = json.Unmarshal(tmp, &u)
		if u.Username == "" {
			elog.Info("AuthChecker", elog.Any("step", "Get"), elog.Any("user", user))
			appURL, _, _ := kauth.ParseAppAndSubURL(econf.GetString("app.rootURL"))
			appURL = strings.ReplaceAll(appURL, "9001", "8000")
			c.JSON(http.StatusOK, core.Res{Code: 302, Data: appURL + "login", Msg: "找不到指定token信息(#1)"})
			c.Abort()
			return
		}
		ctxUser := &core.User{
			Uid:      int64(u.ID),
			Nickname: u.Nickname,
			Username: u.Username,
			Avatar:   u.Avatar,
			Email:    u.Email,
		}
		c.Set(core.UserContextKey, ctxUser)
		c.Next()
		return
	}
}
