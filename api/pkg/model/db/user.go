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
	OaId     int    `gorm:"not null;comment:'oa uid'" json:"oa_id"`
	Username string `gorm:"not null;comment:'用户名'" json:"username"`
	Nickname string `gorm:"not null;comment:'昵称'" json:"nickname"`
	Secret   string `gorm:"not null;comment:'秘钥'" json:"secret"`
	Email    string `gorm:"not null;comment:'email'" json:"email"`
	Avatar   string `gorm:"not null;comment:'avatart'" json:"avatar"`
	WebUrl   string `gorm:"not null;comment:'注释'" json:"webUrl"`
	State    string `gorm:"not null;comment:'注释'" json:"state"`
	Hash     string `gorm:"not null;comment:'注释'" json:"hash"`
	Oauth    string `gorm:"not null;" json:"oauth"`   // 来源
	OauthId  string `gorm:"not null;" json:"oauthId"` // 来源id
	Password string `gorm:"not null;comment:'注释'" json:"password"`
	// open source user data
	CurrentAuthority string `json:"currentAuthority"`
	Access           string `json:"access"`

	OauthToken OAuthToken `gorm:"type:json;comment:'OAuth Token 信息'" json:"-"`

	BaseModel
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
