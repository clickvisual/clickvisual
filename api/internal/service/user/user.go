package user

import (
	"errors"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kauth"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

type user struct{}

// NewUser ...
func NewUser() *user {
	u := &user{}
	oauthInfos := make([]kauth.OAuthInfo, 0)

	// 三方鉴权初始化
	_ = econf.UnmarshalKey("auth.tps", &oauthInfos)
	invoker.Logger.Info("AuthInit", elog.Any("step", "UnmarshalKey"), elog.Any("oauthInfos", oauthInfos))
	appURL, appSubURL, _ := kauth.ParseAppAndSubURL(econf.GetString("app.rootURL"))
	baseURL := econf.GetString("app.baseURL")
	invoker.Logger.Info("AuthInit", elog.Any("step", "ParseAppAndSubURL"), elog.Any("appURL", appURL), elog.Any("appSubURL", appSubURL))
	kauth.NewOAuthService(appURL, baseURL, oauthInfos)
	return u
}

// CreateOrUpdateOauthUser 根据oauth获取用户
func (u *user) CreateOrUpdateOauthUser(info *db.User) (err error) {
	var obj db.User
	err = invoker.Db.Where("oauth = ? and oauth_id = ?", info.Oauth, info.OauthId).First(&obj).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		// system error
		invoker.Logger.Error("CreateOrUpdateOauthUser", elog.String("step", "Select"), elog.String("error", err.Error()))
		return
	}
	// not found
	if obj.ID == 0 {
		err = u.Create(info)
		if err != nil {
			invoker.Logger.Error("CreateOrUpdateOauthUser", elog.String("step", "Create"), elog.String("error", err.Error()))
		}
		return
	}
	err = u.Update(obj.ID, info)
	if err != nil {
		invoker.Logger.Error("CreateOrUpdateOauthUser", elog.String("step", "Update"), elog.String("error", err.Error()))
		return
	}
	invoker.Db.Where("oauth = ? and oauth_id = ?", info.Oauth, info.OauthId).First(info)
	return
}

// Create ..
func (u *user) Create(item *db.User) (err error) {
	err = invoker.Db.Where("username = ?", item.Username).Find(item).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	if item.ID > 0 {
		err = errors.New("user name is exist")
		return
	}
	err = invoker.Db.Create(item).Error
	if err != nil {
		return err
	}
	return
}

func (u *user) Update(uid int, user *db.User) (err error) {
	var info db.User
	err = invoker.Db.Where("id = ?", uid).First(&info).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	if info.ID == 0 {
		err = errors.New("user is not exist")
		return
	}
	err = invoker.Db.Model(db.User{}).Where("id = ?", uid).UpdateColumns(&user).Error
	return
}

func (u *user) Delete(item db.User) (err error) {
	var info db.User
	err = invoker.Db.Where("uid = ?", item.ID).Find(&info).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	if info.ID == 0 {
		err = errors.New("用户不存在")
		return
	}
	err = invoker.Db.Where("uid = ?", item.ID).Delete(&db.User{}).Error
	return
}

// GetUserByUID 根据oaUid获取用户
func (u *user) GetUserByUID(uid int) (user db.User) {
	err := invoker.Db.Where("id = ?", uid).First(&user).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}
	if user.ID == 0 {
		err = errors.New("user is not exist")
		return
	}
	return
}
