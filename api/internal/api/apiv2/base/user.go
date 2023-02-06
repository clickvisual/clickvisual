package base

import (
	"github.com/ego-component/egorm"
	"github.com/spf13/cast"
	"golang.org/x/crypto/bcrypt"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

// CreateUser  godoc
// @Tags         User
func CreateUser(c *core.Context) {
	var err error
	params := view.ReqUserCreate{}
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
	check, err := db.UserList(conds)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if len(check) != 0 {
		c.JSONE(1, constx.ErrorRepeatUserName.Error(), nil)
		return
	}
	// gen random password
	pwd := utils.RandomString(8)
	hash, err := bcrypt.GenerateFromPassword([]byte(utils.MD5Encode32(pwd)), bcrypt.DefaultCost)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = db.UserCreate(invoker.Db, &db.User{
		Username: params.Username,
		Nickname: params.Nickname,
		Password: string(hash),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.UserCMDB(c.User(), db.OpnUserCreate, map[string]interface{}{"params": params})
	c.JSONOK(view.RespUserCreate{
		Username: params.Username,
		Password: pwd,
	})
}

// ListUser   	 Get user list
// @Tags         User
func ListUser(c *core.Context) {
	var req view.ReqUserList
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
	total, userResList := db.UserListPage(conds, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	list := make([]view.RespUserSimpleInfo, 0)
	for _, row := range userResList {
		list = append(list, view.RespUserSimpleInfo{
			Uid:      row.ID,
			Username: row.Username,
			Nickname: row.Nickname,
			Email:    row.Email,
			Avatar:   row.Avatar,
			Phone:    row.Phone,
		})
	}
	c.JSONPage(view.RespUserSimpleList{
		Total: total,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
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
	var req db.ReqUserUpdate
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
	if err := db.UserUpdate(invoker.Db, uid, ups); err != nil {
		c.JSONE(1, "password reset failed 01: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnUserUpdate, map[string]interface{}{"req": req})
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
	u, err := db.UserInfo(uid)
	if err != nil {
		c.JSONE(1, "password reset failed 02: "+err.Error(), nil)
		return
	}
	if u.Oauth != "" {
		c.JSONE(1, constx.ErrorUserOauthTypeIsNotPassword.Error(), nil)
		return
	}
	// gen random password
	pwd := utils.RandomString(8)
	hash, err := bcrypt.GenerateFromPassword([]byte(utils.MD5Encode32(pwd)), bcrypt.DefaultCost)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["password"] = string(hash)
	err = db.UserUpdate(invoker.Db, uid, ups)
	if err != nil {
		c.JSONE(1, "password reset failed 01: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnUserPasswordReset, map[string]interface{}{"req": u.Username})
	c.JSONOK(view.RespUserCreate{
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
	err := db.UserDelete(invoker.Db, uid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnUserDelete, map[string]interface{}{"req": uid})
	c.JSONOK()
}
