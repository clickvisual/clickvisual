package db

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

type User struct {
	BaseModel

	OaId             int64      `gorm:"column:oa_id;type:bigint(20);NOT NULL" json:"oaId"`                           // oa_id
	Username         string     `gorm:"column:username;type:varchar(256);NOT NULL" json:"username"`                  // 用户名
	Nickname         string     `gorm:"column:nickname;type:varchar(256);NOT NULL" json:"nickname"`                  // 昵称
	Secret           string     `gorm:"column:secret;type:varchar(256);NOT NULL" json:"secret"`                      // 实例名称
	Email            string     `gorm:"column:email;type:varchar(64);NOT NULL" json:"email"`                         // email
	Avatar           string     `gorm:"column:avatar;type:varchar(256);NOT NULL" json:"avatar"`                      // avatar
	Hash             string     `gorm:"column:hash;type:varchar(256);NOT NULL" json:"hash"`                          // hash
	WebUrl           string     `gorm:"column:web_url;type:varchar(256);NOT NULL" json:"webUrl"`                     // webUrl
	Oauth            string     `gorm:"column:oauth;type:varchar(256);NOT NULL" json:"oauth"`                        // oauth
	State            string     `gorm:"column:state;type:varchar(256);NOT NULL" json:"state"`                        // state
	OauthId          string     `gorm:"column:oauth_id;type:varchar(256);NOT NULL" json:"oauthId"`                   // oauthId
	Password         string     `gorm:"column:password;type:varchar(256);NOT NULL" json:"password"`                  // password
	CurrentAuthority string     `gorm:"column:current_authority;type:varchar(256);NOT NULL" json:"currentAuthority"` // currentAuthority
	Access           string     `gorm:"column:access;type:varchar(256);NOT NULL" json:"access"`                      // access
	OauthToken       OAuthToken `gorm:"column:oauth_token;type:text" json:"-"`                                       // oauth_token
}

func (User) TableName() string {
	return TableNameUser
}

type OAuthToken struct {
	*oauth2.Token
}

func (t OAuthToken) Value() (driver.Value, error) {
	b, err := json.Marshal(t)
	return string(b), err
}

func (t *OAuthToken) Scan(input interface{}) error {
	return json.Unmarshal(input.([]byte), t)
}

// UserCreate CRUD
func UserCreate(db *gorm.DB, data *User) (err error) {
	if err = db.Create(data).Error; err != nil {
		elog.Error("create cluster error", zap.Error(err))
		return
	}
	return
}

// UserUpdate ...
func UserUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameUser).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update cluster error", zap.Error(err))
		return
	}
	return
}

func UserInfo(paramId int) (resp User, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameUser).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("cluster info error", zap.Error(err))
		return
	}
	return
}

// UserInfoX Info的扩展方法，根据Cond查询单条记录
func UserInfoX(conds map[string]interface{}) (resp User, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameUser).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("UserInfoX infoX error", zap.Error(err))
		return
	}
	return
}

// UserDelete 软删除
func UserDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(User{}).Delete(&User{}, id).Error; err != nil {
		elog.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

// UserList 获取当前所有未删除的clusters. 主要供 前端用
func UserList(conds egorm.Conds) (resp []*User, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameUser).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list clusters error", elog.String("err", err.Error()))
		return
	}
	return
}

// UserListPage 根据分页条件查询list
func UserListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*User) {
	respList = make([]*User, 0)
	conds["dtime"] = 0
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Table(TableNameUser).Where(sql, binds...)
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}
