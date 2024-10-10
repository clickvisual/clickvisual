package db

import (
	"time"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func (b *BaseShortURL) TableName() string {
	return TableNameBaseShortURL
}

type BaseShortURL struct {
	BaseModel

	OriginUrl string `gorm:"column:origin_url;type:text" json:"origin_url"`
	SCode     string `gorm:"column:s_code;type:varchar(64);NOT NULL" json:"s_code"`
	CallCnt   int    `gorm:"column:call_cnt;type:int(11)" json:"call_cnt"`
}

type ReqShortURLCreate struct {
	OriginUrl string `json:"originUrl" form:"originUrl"`
}

func ShortURLInfoByURL(db *gorm.DB, url string) (resp BaseShortURL, err error) {
	var sql = "`origin_url`=?"
	var binds = []interface{}{url}
	if err = db.Model(BaseShortURL{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "short url: %s", url)
		return
	}
	return
}

func ShortURLInfoBySCode(db *gorm.DB, sCode string) (resp BaseShortURL, err error) {
	var sql = "`s_code`=?"
	var binds = []interface{}{sCode}
	if err = db.Model(BaseShortURL{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "short url code: %s", sCode)
		return
	}
	return
}

func ShortURLCreate(db *gorm.DB, data *BaseShortURL) (err error) {
	if err = db.Model(BaseShortURL{}).Create(data).Error; err != nil {
		elog.Error("create error", zap.Error(err))
		return
	}
	return
}

func ShortURLUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(BaseShortURL{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update error", zap.Error(err))
		return
	}
	return
}

func ShortURLDelete30Days() {
	expire := time.Hour * 24 * 30
	if err := invoker.Db.Model(BaseShortURL{}).Where("utime<?", time.Now().Add(-expire).Unix()).Unscoped().Delete(&BaseShortURL{}).Error; err != nil {
		elog.Error("delete error", zap.Error(err))
		return
	}
}
