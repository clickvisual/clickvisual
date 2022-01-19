package user

import (
	"encoding/json"

	"github.com/gotomicro/ego-component/egorm"
	"golang.org/x/crypto/bcrypt"

	"github.com/gin-contrib/sessions"

	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

// Info get userinfo
func Info(c *core.Context) {
	session := sessions.Default(c.Context)
	user := session.Get("user")
	tmp, _ := json.Marshal(user)
	u := db.User{}
	_ = json.Unmarshal(tmp, &u)
	u.Password = ""
	c.JSONOK(u)
	return
}

type login struct {
	Username string `form:"username" binding:"required"`
	Password string `form:"password" binding:"required"`
}

// Login ...
func Login(c *core.Context) {
	var param login
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["username"] = param.Username
	user, _ := db.UserInfoX(conds)
	// hash, err := bcrypt.GenerateFromPassword([]byte(param.Password), bcrypt.DefaultCost)
	// if err != nil {
	// 	fmt.Println(err)
	// }
	// fmt.Println(string(hash))
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(param.Password))
	if err != nil {
		c.JSONE(1, "account or password error", "")
		return
	}
	session := sessions.Default(c.Context)
	session.Set("user", user)
	_ = session.Save()
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
