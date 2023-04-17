package configure

import (
	"fmt"
	"time"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func (s *configure) TryLock(uid, configId int) (err error) {
	var config db.Configuration

	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&config).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}

		if config.LockUid != 0 && config.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("failed to release the edit lock because another client is currently editing")
		}

		err = tx.Model(&db.Configuration{}).Where("id = ?", config.ID).Updates(map[string]interface{}{
			"lock_at":  time.Now().Unix(),
			"lock_uid": uid,
		}).Error
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "failed to get edit lock")
		}
	}
	return tx.Commit().Error
}

func (s *configure) Unlock(uid, configId int) (err error) {
	var config db.Configuration

	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&config).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}

		if config.LockUid != 0 && config.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("failed to release the edit lock because another client is currently editing")
		}

		err = tx.Model(&db.Configuration{}).Where("id = ?", config.ID).Updates(map[string]interface{}{
			"lock_at":  nil,
			"lock_uid": 0,
		}).Error
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "failed to release edit lock")
		}
	}
	return tx.Commit().Error
}
