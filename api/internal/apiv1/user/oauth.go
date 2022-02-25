package user

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"

	"github.com/gin-contrib/sessions"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kauth"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
)

func Oauth(c *core.Context) {
	if kauth.OAuthService == nil {
		c.JSONE(1, "oauth not enabled", nil)
		return
	}

	name := c.Param("oauth")
	connect, ok := kauth.ConnectorMap[name]
	if !ok {
		c.JSONE(1, fmt.Sprintf("No OAuth with name %s configured", name), nil)
		return
	}
	state := c.Query("state")
	errorParam := c.Query("error")
	if errorParam != "" {
		errorDesc := c.Query("error_description")
		elog.Error("failed to login ", zap.Any("error", errorParam), zap.String("errorDesc", errorDesc))
		c.JSONE(2, fmt.Sprintf("failed to login, errorParam: %s", errorParam), nil)
		return
	}

	code := c.Query("code")
	if code == "" {
		var err error
		state, err = kauth.GenStateString()
		if err != nil {
			elog.Error("Generating state string failed", zap.Error(err))
			c.JSONE(3, "internal error occurred", nil)
			return
		}

		elog.Info("Oauth", zap.String("state", state))
		hashedState := kauth.HashStateCode(state, econf.GetString("app.secretKey"), kauth.OAuthService.OAuthInfos[name].ClientSecret)
		elog.Info("Oauth", zap.String("hashedState", hashedState))

		c.SetCookie(
			kauth.OauthStateCookieName,
			url.QueryEscape(hashedState),
			econf.GetInt("auth.OauthStateCookieMaxAge"),
			"/",
			"",
			false, // todo
			true,
		)

		if kauth.OAuthService.OAuthInfos[name].HostedDomain == "" {
			elog.Info("Oauth", zap.Any("AuthCodeURL", connect.AuthCodeURL(state, oauth2.AccessTypeOnline)))
			c.Redirect(http.StatusFound, connect.AuthCodeURL(state, oauth2.AccessTypeOnline))
			return
		} else {
			c.Redirect(http.StatusFound, connect.AuthCodeURL(state, oauth2.SetAuthURLParam("hd", kauth.OAuthService.OAuthInfos[name].HostedDomain), oauth2.AccessTypeOnline))
			return
		}
	}

	cookie, err := c.Cookie(kauth.OauthStateCookieName)
	if err != nil {
		c.JSONE(4, "get cookie fail, "+err.Error(), nil)
		return
	}
	cookieState, err := url.QueryUnescape(cookie)
	if err != nil {
		c.JSONE(4, "unescape query fail, "+err.Error(), nil)
		return
	}

	// delete cookie
	c.SetCookie(
		kauth.OauthStateCookieName,
		"",
		-1,
		"/",
		"",
		false, // todo
		true,
	)

	if cookieState == "" {
		c.JSONE(5, "login.OAuthLogin(missing saved state)", nil)
		return
	}

	queryState := kauth.HashStateCode(state, econf.GetString("app.secretKey"), kauth.OAuthService.OAuthInfos[name].ClientSecret)
	elog.Info("state check", zap.String("state", state), zap.String("secretKey", econf.GetString("app.secretKey")), zap.String("ClientSecret", kauth.OAuthService.OAuthInfos[name].ClientSecret), zap.Any("queryState", queryState), zap.Any("cookieState", cookieState))
	if cookieState != queryState {
		c.JSONE(6, "login.OAuthLogin(state mismatch)", nil)
		return
	}

	// handle call back
	tr := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: kauth.OAuthService.OAuthInfos[name].TlsSkipVerify,
		},
	}
	oauthClient := &http.Client{
		Transport: tr,
	}

	if kauth.OAuthService.OAuthInfos[name].TlsClientCert != "" || kauth.OAuthService.OAuthInfos[name].TlsClientKey != "" {
		cert, err := tls.LoadX509KeyPair(kauth.OAuthService.OAuthInfos[name].TlsClientCert, kauth.OAuthService.OAuthInfos[name].TlsClientKey)
		if err != nil {
			elog.Error("Failed to setup TlsClientCert", zap.String("oauth", name), zap.Error(err))
			c.JSONE(7, "login.OAuthLogin(Failed to setup TlsClientCert)", nil)
			return
		}

		tr.TLSClientConfig.Certificates = append(tr.TLSClientConfig.Certificates, cert)
	}

	if kauth.OAuthService.OAuthInfos[name].TlsClientCa != "" {
		caCert, err := ioutil.ReadFile(kauth.OAuthService.OAuthInfos[name].TlsClientCa)
		if err != nil {
			elog.Error("Failed to setup TlsClientCa", zap.String("oauth", name), zap.Error(err))
			c.JSONE(8, "login.OAuthLogin(Failed to setup TlsClientCa)", nil)
			return
		}
		caCertPool := x509.NewCertPool()
		caCertPool.AppendCertsFromPEM(caCert)

		tr.TLSClientConfig.RootCAs = caCertPool
	}

	oauthCtx := context.WithValue(context.Background(), oauth2.HTTPClient, oauthClient)

	// get token from provider
	token, err := connect.Exchange(oauthCtx, code)
	if err != nil {
		c.JSONE(9, "login.OAuthLogin(NewTransportWithCode)", err.Error())
		return
	}
	// token.TokenType was defaulting to "bearer", which is out of spec, so we explicitly set to "Bearer"
	token.TokenType = "Bearer"

	elog.Debug("OAuthLogin Got token", zap.Any("token", token))

	// set up oauth2 client
	client := connect.Client(oauthCtx, token)

	_, appSubURL, _ := kauth.ParseAppAndSubURL(econf.GetString("app.rootURL"))

	// get user info
	userInfo, err := connect.UserInfo(client, token)
	if err != nil {
		if _, ok := err.(*kauth.Error); ok {
			// todo
			c.Redirect(http.StatusFound, appSubURL+"/login")
			return
		} else {
			c.JSONE(10, fmt.Sprintf("login.OAuthLogin(get info from %s error %s)", name, err.Error()), nil)
			return
		}
	}

	elog.Debug("OAuthLogin got user info", zap.Any("userInfo", userInfo))

	// validate that we got at least an email address
	if userInfo.Email == "" {
		c.Redirect(http.StatusFound, appSubURL+"/login")
		return
	}

	// validate that the email is allowed to login to juno
	if !connect.IsEmailAllowed(userInfo.Email) {
		c.Redirect(http.StatusFound, appSubURL+"/login")
		return
	}

	// TODO 存储用户数据
	mysqlUser := &db.User{
		Username:   userInfo.Name + "_" + name,
		Nickname:   userInfo.Login + "_" + name,
		Email:      userInfo.Email,
		Oauth:      "oauth_" + name,
		OauthId:    userInfo.Id,
		OauthToken: db.OAuthToken{Token: token},
	}
	// create or update oauth user
	err = service.User.CreateOrUpdateOauthUser(mysqlUser)
	if err != nil {
		c.JSONE(11, "create or update oauth user error", err.Error())
		return
	}
	elog.Debug("OAuthLogin got user info", zap.Any("mysqlUserInfo", mysqlUser))

	session := sessions.Default(c.Context)
	session.Set("user", mysqlUser)
	_ = session.Save()
	toURULCookie, err := c.Cookie("redirect_chui_auth_to")
	toURL := appSubURL + "/"
	if err != nil {
		c.Redirect(http.StatusFound, toURL)
		return
	}
	toURL, err = url.QueryUnescape(toURULCookie)
	if err != nil {
		c.Redirect(http.StatusFound, toURL)
		return
	}
	c.Redirect(http.StatusFound, toURL)
	return
}
