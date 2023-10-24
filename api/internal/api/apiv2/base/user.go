package base

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"
	"golang.org/x/crypto/bcrypt"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	utils2 "github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
)

// CreateUser  godoc
// @Tags         User
func CreateUser(c *core.Context) {
	var err error
	params := view2.ReqUserCreate{}
	err = c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	conds := egorm.Conds{}
	conds["username"] = params.Username
	check, err := db2.UserList(conds)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if len(check) != 0 {
		c.JSONE(1, constx.ErrorRepeatUserName.Error(), nil)
		return
	}
	// gen random password
	pwd := utils2.RandomString(8)
	hash, err := bcrypt.GenerateFromPassword([]byte(utils2.MD5Encode32(pwd)), bcrypt.DefaultCost)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = db2.UserCreate(invoker.Db, &db2.User{
		Username: params.Username,
		Nickname: params.Nickname,
		Password: string(hash),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.UserCMDB(c.User(), db2.OpnUserCreate, map[string]interface{}{"params": params})
	c.JSONOK(view2.RespUserCreate{
		Username: params.Username,
		Password: pwd,
	})
}

// ListUser   	 Get user list
// @Tags         User
func ListUser(c *core.Context) {
	var req view2.ReqUserList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "request parameter error: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	if req.Username != "" {
		conds["username"] = egorm.Cond{
			Op:  "like",
			Val: req.Username,
		}
	}
	total, userResList := db2.UserListPage(conds, &db2.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	list := make([]view2.RespUserSimpleInfo, 0)
	for _, row := range userResList {
		list = append(list, view2.RespUserSimpleInfo{
			Uid:      row.ID,
			Username: row.Username,
			Nickname: row.Nickname,
			Email:    row.Email,
			Avatar:   row.Avatar,
			Phone:    row.Phone,
		})
	}
	c.JSONPage(view2.RespUserSimpleList{
		Total: total,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
}

// UpdateUser
// @Tags         User
func UpdateUser(c *core.Context) {
	uid := cast.ToInt(c.Param("user-id"))
	if uid == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if uid != c.Uid() {
		err := permission.Manager.IsRootUser(c.Uid())
		if err == nil {
			goto UPDATE
		}
		c.JSONE(1, "permission verification failed", err)
		return
	}

UPDATE:
	var req db2.ReqUserUpdate
	if err := c.Bind(&req); err != nil {
		c.JSONE(core.CodeErr, "param error:"+err.Error(), err)
		return
	}
	if len(req.Phone) != 11 {
		c.JSONE(1, "Illegal cell phone number length", nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["email"] = req.Email
	ups["phone"] = req.Phone
	ups["nickname"] = req.Nickname
	if err := db2.UserUpdate(invoker.Db, uid, ups); err != nil {
		c.JSONE(1, "password reset failed 01: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnUserUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// ResetUserPassword  godoc
// @Tags         User
func ResetUserPassword(c *core.Context) {
	uid := cast.ToInt(c.Param("user-id"))
	if uid == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	u, err := db2.UserInfo(uid)
	if err != nil {
		c.JSONE(1, "password reset failed 02: "+err.Error(), nil)
		return
	}
	if u.Oauth != "" {
		c.JSONE(1, constx.ErrorUserOauthTypeIsNotPassword.Error(), nil)
		return
	}
	// gen random password
	pwd := utils2.RandomString(8)
	hash, err := bcrypt.GenerateFromPassword([]byte(utils2.MD5Encode32(pwd)), bcrypt.DefaultCost)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["password"] = string(hash)
	err = db2.UserUpdate(invoker.Db, uid, ups)
	if err != nil {
		c.JSONE(1, "password reset failed 01: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnUserPasswordReset, map[string]interface{}{"req": u.Username})
	c.JSONOK(view2.RespUserCreate{
		Username: u.Username,
		Password: pwd,
	})
}

// DeleteUser  godoc
// @Tags         User
func DeleteUser(c *core.Context) {
	uid := cast.ToInt(c.Param("user-id"))
	if uid == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	err := db2.UserDelete(invoker.Db, uid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnUserDelete, map[string]interface{}{"req": uid})
	c.JSONOK()
}
