package db

import (
	"database/sql/driver"
	"encoding/json"

	"golang.org/x/oauth2"
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
