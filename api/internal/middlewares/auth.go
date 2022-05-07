package middlewares

import (
	"encoding/json"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kauth"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {

		switch {
		case !isNotAnonymousUser(c):
		case !isNotAuthProxy(c):
		default:
			session := sessions.Default(c)
			user := session.Get("user")
			if user == nil {
				appURL, _, _ := kauth.ParseAppAndSubURL(econf.GetString("app.rootURL"))
				c.JSON(http.StatusOK, core.Res{Code: 302, Data: appURL + "user/login", Msg: "Cannot find specified token information (# 1)"})
				c.Abort()
				return
			}
			u := db.User{}
			userBytes, _ := json.Marshal(user)
			if _ = json.Unmarshal(userBytes, &u); u.Username == "" {
				appURL, _, _ := kauth.ParseAppAndSubURL(econf.GetString("app.rootURL"))
				c.JSON(http.StatusOK, core.Res{Code: 302, Data: appURL + "user/login", Msg: "Cannot find specified token information (# 2)"})
				c.Abort()
				return
			}
			ctxUser := &core.User{Uid: int64(u.ID), Nickname: u.Nickname, Username: u.Username, Avatar: u.Avatar, Email: u.Email}
			c.Set(core.UserContextKey, ctxUser)
			c.Next()
			return
		}
	}
}

func isNotAnonymousUser(c *gin.Context) bool {
	if !econf.GetBool("auth.anonymous.enabled") {
		return true
	}
	u := &db.User{Username: "anonymous", Nickname: "anonymous", BaseModel: db.BaseModel{ID: 999999}}
	ctxUser := &core.User{Uid: int64(u.ID), Nickname: u.Nickname, Username: u.Username, Avatar: u.Avatar, Email: u.Email}
	c.Set(core.UserContextKey, ctxUser)
	c.Next()
	return false
}

func isNotAuthProxy(c *gin.Context) bool {
	username := c.GetHeader(econf.GetString("auth.proxy.headerName"))
	// Bail if auth proxy is not enabled
	if !econf.GetBool("auth.proxy.enabled") {
		return true
	}
	// If there is no header - we can't move forward
	if username == "" {
		return true
	}
	// User login
	conds := egorm.Conds{}
	conds["username"] = username
	u, err := db.UserInfoX(conds)
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		invoker.Logger.Error("isNotAuthProxy", elog.String("step", "UserInfoX"), elog.String("username", username), elog.String("error", err.Error()))
		return true
	}
	if u.ID == 0 {
		u = db.User{Username: username, Nickname: username, Access: "auth.proxy"}
		err = db.UserCreate(invoker.Db, &u)
		if err != nil {
			invoker.Logger.Error("isNotAuthProxy", elog.String("step", "UserCreate"), elog.String("username", username), elog.String("error", err.Error()))
			return true
		}
	}
	if econf.GetBool("auth.proxy.isAutoLogin") {
		if c.GetHeader("X-ClickVisual-Not-Auto-Login") != "TRUE" {
			session := sessions.Default(c)
			session.Set("user", u)
			errSave := session.Save()
			if errSave != nil {
				invoker.Logger.Error("isNotAuthProxy", elog.String("step", "sessionSave"), elog.Any("username", u), elog.String("error", err.Error()))
				return true
			}
		}
	}
	// is Root
	if c.GetHeader(econf.GetString("auth.proxy.rootTokenKey")) == econf.GetString("auth.proxy.rootTokenValue") {
		errRoot := permission.Manager.IsRootUser(u.ID)
		invoker.Logger.Debug("isNotAuthProxy", elog.Any("errRoot", errRoot))
		if errRoot != nil {
			invoker.Logger.Debug("isNotAuthProxy", elog.String("step", "rootUpdate"), elog.Any("user", u))
			roots := permission.Manager.GetRootUsersId()
			roots = append(roots, u.ID)
			permission.Manager.GrantRootUsers(roots)
		}
	}
	invoker.Logger.Debug("isNotAuthProxy", elog.String("step", "finish"), elog.Any("user", u))
	ctxUser := &core.User{Uid: int64(u.ID), Nickname: u.Nickname, Username: u.Username, Avatar: u.Avatar, Email: u.Email}
	c.Set(core.UserContextKey, ctxUser)
	c.Next()
	return false
}
