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

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/component/core"

	"github.com/shimohq/mogo/api/pkg/model/db"
)

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {

		switch {
		case initContextWithAuthProxy(c):
		case initContextWithAnonymousUser(c):
		}

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
			c.JSON(http.StatusOK, core.Res{Code: 302, Data: appURL + "user/login", Msg: "Cannot find specified token information (# 1)"})
			c.Abort()
			return
		}
		ctxUser := &core.User{Uid: int64(u.ID), Nickname: u.Nickname, Username: u.Username, Avatar: u.Avatar, Email: u.Email}
		c.Set(core.UserContextKey, ctxUser)
		c.Next()
		return
	}
}

func initContextWithAnonymousUser(c *gin.Context) bool {
	if !econf.GetBool("auth.anonymous.enabled") {
		return false
	}
	u := &db.User{Username: "admin", Nickname: "admin", BaseModel: db.BaseModel{ID: 999}}
	session := sessions.Default(c)
	session.Set("user", u)
	err := session.Save()
	if err == nil {
		return true
	}
	return false
}

func initContextWithAuthProxy(c *gin.Context) bool {
	username := c.GetHeader(econf.GetString("auth.proxy.headerName"))
	// Bail if auth proxy is not enabled
	if !econf.GetBool("auth.proxy.enabled") {
		return false
	}
	// If there is no header - we can't move forward
	if username == "" {
		return false
	}
	// User login
	conds := egorm.Conds{}
	conds["username"] = username
	user, err := db.UserInfoX(conds)
	if err != nil && !errors.Is(err, egorm.ErrRecordNotFound) {
		elog.Error("initContextWithAuthProxy", elog.String("step", "UserInfoX"), elog.String("username", "username"), elog.String("error", err.Error()))
		return false
	}
	if user.ID == 0 {
		user = db.User{Username: username, Nickname: username, Access: "auth.proxy"}
		err = db.UserCreate(invoker.Db, &user)
		if err != nil {
			elog.Error("initContextWithAuthProxy", elog.String("step", "UserCreate"), elog.String("username", "username"), elog.String("error", err.Error()))
			return false
		}
	}
	elog.Debug("initContextWithAuthProxy", elog.String("step", "finish"), elog.Any("user", user))
	session := sessions.Default(c)
	session.Set("user", user)
	err = session.Save()
	if err == nil {
		return true
	}
	return false
}
