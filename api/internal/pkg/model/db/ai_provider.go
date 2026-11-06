package db

import (
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

// AIProvider is one admin-managed model endpoint. Rows are tried in Sort
// order; ProviderKey is the stable id shown in the UI and logs.
type AIProvider struct {
	BaseModel

	ProviderKey     string `gorm:"column:provider_key;type:varchar(32);not null;default:''" json:"providerKey"`
	Name            string `gorm:"column:name;type:varchar(64);not null;default:''" json:"name"`
	Kind            string `gorm:"column:kind;type:varchar(16);not null;default:'openai'" json:"kind"`
	BaseURL         string `gorm:"column:base_url;type:varchar(255);not null;default:''" json:"baseURL"`
	Model           string `gorm:"column:model;type:varchar(128);not null;default:''" json:"model"`
	ReasoningEffort string `gorm:"column:reasoning_effort;type:varchar(16);not null;default:''" json:"reasoningEffort"`
	APIKeyEncrypted string `gorm:"column:api_key_encrypted;type:text" json:"-"`
	Enabled         int    `gorm:"column:enabled;type:tinyint(1);default:0" json:"enabled"`
	Sort            int    `gorm:"column:sort;type:int(11);default:0" json:"sort"`
	CreatorUid      int    `gorm:"column:creator_uid;type:int(11)" json:"creatorUid"`
	UpdaterUid      int    `gorm:"column:updater_uid;type:int(11)" json:"updaterUid"`
}

func (a *AIProvider) TableName() string {
	return TableNameAIProvider
}

func AIProviderList(db *gorm.DB) (resp []AIProvider, err error) {
	if err = db.Model(AIProvider{}).Order("sort asc, id asc").Find(&resp).Error; err != nil {
		return nil, errors.Wrap(err, "list ai providers")
	}
	return resp, nil
}

// AIProviderReplaceAll swaps the whole ordered list in one transaction. Old
// rows are hard-deleted so provider keys can be reused.
func AIProviderReplaceAll(db *gorm.DB, list []AIProvider) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Unscoped().Where("1 = 1").Delete(&AIProvider{}).Error; err != nil {
			return errors.Wrap(err, "clear ai providers")
		}
		for i := range list {
			list[i].ID = 0
			list[i].Sort = i
			if err := tx.Create(&list[i]).Error; err != nil {
				return errors.Wrap(err, "create ai provider")
			}
		}
		return nil
	})
}
