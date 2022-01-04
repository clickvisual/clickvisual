package user

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"

	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/gin-contrib/sessions"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/pkg/model/db"
)

// Info get userinfo
func Info(c *core.Context) {
	session := sessions.Default(c.Context)
	user := session.Get("user")
	tmp, _ := json.Marshal(user)
	u := db.User{}
	_ = json.Unmarshal(tmp, &u)
	c.JSONOK(u)
	return
}

type login struct {
	Username string `form:"username"`
	Password string `form:"password"`
}

func md5V(str string) string {
	h := md5.New()
	h.Write([]byte(str))
	return hex.EncodeToString(h.Sum(nil))
}

// Login ...
func Login(c *core.Context) {
	var data login
	_ = c.Bind(&data)

	// 登录的时候直接校验
	m := md5V("admin")
	elog.Debug("login", elog.Any("data", data), elog.String("m", m))
	if data.Username != "admin" || data.Password != m {
		c.JSONE(1, "login failed", nil)
		return
	}

	mockUser := &db.User{
		Username: "admin",
		Nickname: "admin",
	}
	session := sessions.Default(c.Context)
	session.Set("user", mockUser)
	_ = session.Save()

	// hash, err := bcrypt.GenerateFromPassword([]byte(m), bcrypt.DefaultCost)
	//
	// u := user.User.GetUserByName(data.Username)
	// err := bcrypt.CompareHashAndPassword([]byte(), []byte(data.Password))
	// if err != nil {
	// 	c.JSONE(1, output.MsgErr, "账号或密码错误", "")
	// 	return
	// }

	c.JSONOK("")
	return
}

// Logout ..
func Logout(c *core.Context) {
	session := sessions.Default(c.Context)
	session.Delete("user")
	err := session.Save()
	if err != nil {
		c.JSONE(1, "logout fail", err.Error())
		return
	}
	c.JSONOK("succ")
	return
}
