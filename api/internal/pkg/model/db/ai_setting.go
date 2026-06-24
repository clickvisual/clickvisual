package db

import (
	stderrors "errors"
	"fmt"
	"strings"

	"github.com/gotomicro/cetus/x"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const DefaultAISettingID = 1

type AISetting struct {
	BaseModel

	Enabled            int     `gorm:"column:enabled;type:tinyint(1);default:0" json:"enabled"`
	BaseURL            string  `gorm:"column:base_url;type:varchar(255)" json:"baseURL"`
	APIKeyEncrypted    string  `gorm:"column:api_key_encrypted;type:text" json:"-"`
	Model              string  `gorm:"column:model;type:varchar(128)" json:"model"`
	TimeoutSeconds     int     `gorm:"column:timeout_seconds;type:int(11);default:5" json:"timeoutSeconds"`
	MaxInputBytes      int     `gorm:"column:max_input_bytes;type:int(11);default:32768" json:"maxInputBytes"`
	DefaultTemperature float64 `gorm:"column:default_temperature;type:decimal(4,2);default:0.2" json:"defaultTemperature"`
	DefaultMaxTokens   int     `gorm:"column:default_max_tokens;type:int(11);default:800" json:"defaultMaxTokens"`
	CreatorUid         int     `gorm:"column:creator_uid;type:int(11)" json:"creatorUid"`
	UpdaterUid         int     `gorm:"column:updater_uid;type:int(11)" json:"updaterUid"`
}

func (a *AISetting) TableName() string {
	return TableNameAISetting
}

func (a *AISetting) GetAPIKey() string {
	if a.APIKeyEncrypted == "" {
		return ""
	}
	aesKey := econf.GetString("app.encryptionKey")
	if aesKey == "" || !(len(aesKey) == 16 || len(aesKey) == 24 || len(aesKey) == 32) {
		return a.APIKeyEncrypted
	}
	res, err := x.AESDecrypt(a.APIKeyEncrypted, aesKey)
	if err != nil {
		elog.Panic("aes decrypt error", zap.Error(err))
	}
	return res
}

func (a *AISetting) SetAPIKey(apiKey string) string {
	if strings.TrimSpace(apiKey) == "" {
		return ""
	}
	aesKey := econf.GetString("app.encryptionKey")
	if aesKey == "" || !(len(aesKey) == 16 || len(aesKey) == 24 || len(aesKey) == 32) {
		return apiKey
	}
	res, err := x.AESEncrypt(apiKey, aesKey)
	if err != nil {
		elog.Panic("aes encrypt error", zap.Error(err))
	}
	return res
}

func AISettingInfo(db *gorm.DB) (resp AISetting, err error) {
	if err = db.Model(AISetting{}).Where("id = ?", DefaultAISettingID).First(&resp).Error; err != nil && !stderrors.Is(err, gorm.ErrRecordNotFound) {
		return resp, errors.Wrap(err, "load ai setting")
	}
	return
}

func AISettingCreate(db *gorm.DB, data *AISetting) (err error) {
	if data.ID == 0 {
		data.ID = DefaultAISettingID
	}
	if err = db.Model(AISetting{}).Create(data).Error; err != nil {
		return errors.Wrap(err, "create ai setting")
	}
	return
}

func AISettingUpdate(db *gorm.DB, ups map[string]interface{}) (err error) {
	if err = db.Model(AISetting{}).Where("id = ?", DefaultAISettingID).Updates(ups).Error; err != nil {
		return errors.Wrap(err, fmt.Sprintf("update ai setting: %v", ups))
	}
	return
}

func AISettingUpsert(uid int, data AISetting) (resp AISetting, err error) {
	current, err := AISettingInfo(invoker.Db)
	if err != nil {
		current = AISetting{}
	}

	data.ID = DefaultAISettingID
	if current.ID == 0 {
		data.CreatorUid = uid
	} else {
		data.CreatorUid = current.CreatorUid
		if data.APIKeyEncrypted == "" {
			data.APIKeyEncrypted = current.APIKeyEncrypted
		}
	}
	data.UpdaterUid = uid

	if err = invoker.Db.Model(&AISetting{}).Where("id = ?", DefaultAISettingID).Assign(data).FirstOrCreate(&resp).Error; err != nil {
		return resp, errors.Wrap(err, "upsert ai setting")
	}
	return resp, nil
}
