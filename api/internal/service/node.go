package service

import (
	"fmt"
	"time"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func NodeTryLock(uid, configId int) (err error) {
	var node db.Node

	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&node).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}

		if node.LockUid != 0 && node.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("failed to release the edit lock because another client is currently editing")
		}

		err = tx.Model(&db.Node{}).Where("id = ?", node.ID).Updates(map[string]interface{}{
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

func NodeUnlock(uid, configId int) (err error) {
	var node db.Node

	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&node).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}

		if node.LockUid != 0 && node.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("failed to release the edit lock because another client is currently editing")
		}

		err = tx.Model(&db.Node{}).Where("id = ?", node.ID).Updates(map[string]interface{}{
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
