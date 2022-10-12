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

// UserCreate  godoc
// @Summary      Create new user
// @Description  username 登陆账号
// @Description  nickname 显示用户名
// @Tags         base
// @Produce      json
// @Param        req body view.ReqUserCreate true "params"
// @Success      200 {object} core.Res{data=view.RespUserCreate}
// @Router       /api/v2/base/users [post]
func UserCreate(c *core.Context) {
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

// UserList  godoc
// @Summary	     Get user list
// @Description  Get user list
// @Tags         base
// @Accept       json
// @Produce      json
// @Param        req query view.ReqUserList true "params"
// @Success      200 {object} view.RespUserSimpleList
// @Router       /api/v2/base/users [get]
func UserList(c *core.Context) {
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

// UserPasswordReset  godoc
// @Summary	     Reset user password
// @Description  Reset user password
// @Tags         base
// @Accept       json
// @Produce      json
// @Param        user-id path int true "user id"
// @Success      200 {object} core.Res{data=view.RespUserCreate}
// @Router       /api/v2/base/users/{user-id}/password-reset [patch]
func UserPasswordReset(c *core.Context) {
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

// UserDelete  godoc
// @Summary	     User delete
// @Description  User delete
// @Tags         base
// @Accept       json
// @Produce      json
// @Param        user-id path int true "user id"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/base/users/{user-id} [delete]
func UserDelete(c *core.Context) {
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
