package base

import (
	"github.com/ego-component/egorm"
	"golang.org/x/crypto/bcrypt"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

// UserCreate  godoc
// @Summary      Create new user
// @Description  Create new user
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
		c.JSONE(1, err.Error(), nil)
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
		Password: string(hash),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.UserCMDB(c.User(), db.OpnUserCreate, map[string]interface{}{"new_user": params.Username})
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
// @Success      200 {object} view.RespNodeResultList
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
	total, _ := db.UserListPage(conds, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	// list := make([]view.RespUserList, 0)
	// for _, row := range userResList {
	// list = append(list, service.Node.NodeResultRespAssemble(nodeRes))
	// }
	c.JSONPage(view.RespNodeResultList{
		Total: total,
		// List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}
