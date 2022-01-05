package configure

import (
	"context"
	"fmt"
	"time"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

func (s *configure) TryLock(uid, configId int) (err error) {
	var config db.Configuration

	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&config).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("配置不存在")
		}

		if config.LockUid != 0 && config.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("当前有其他客户端正在编辑,获取编辑锁失败")
		}

		now := time.Now()
		err = tx.Model(&db.Configuration{}).Where("id = ?", config.ID).Updates(map[string]interface{}{
			"lock_at":  &now,
			"lock_uid": uid,
		}).Error
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "获取编辑锁失败")
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
			return fmt.Errorf("配置不存在")
		}

		if config.LockUid != 0 && config.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("当前有其他客户端正在编辑,释放编辑锁失败")
		}

		err = tx.Model(&db.Configuration{}).Where("id = ?", config.ID).Updates(map[string]interface{}{
			"lock_at":  nil,
			"lock_uid": 0,
		}).Error
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "释放编辑锁失败")
		}
	}
	return tx.Commit().Error
}

// clearLockPeriodically 定期清除编辑锁
func (s *configure) clearLockPeriodically() {
	var configs []db.Configuration

	for {
		time.Sleep(ExpiredLockTime / 2 * time.Second)

		offsetTime := time.Now().Add(-ExpiredLockTime * time.Second)
		tx := invoker.Db.Begin()
		{
			err := tx.Set("gorm:query_option", "FOR UPDATE").Where("lock_at is not null and lock_at < ?", offsetTime).Find(&configs).Error
			if err != nil {
				elog.Error("clearLockPeriodically", elog.String("err", err.Error()))
				tx.Rollback()
				continue
			}

			for _, config := range configs {
				tx.Model(&db.Configuration{}).Where("id = ?", config.ID).Updates(map[string]interface{}{
					"lock_at":  nil,
					"lock_uid": 0,
				})
			}
		}
		tx.Commit()
	}
}

type configMapLock struct {
	namespace     string
	configmapName string
	configmapId   int
	locked        bool
}

func NewConfigMapLock(namespace, configmapName string, configmapId int) *configMapLock {
	return &configMapLock{namespace, configmapName, configmapId, false}
}

func (l *configMapLock) configMapLockKey() string {
	return fmt.Sprintf("lock:configmap:%s:%s:%d", l.namespace, l.configmapName, l.configmapId)
}

// Lock complete returns true
func (l *configMapLock) Lock() bool {
	ok, _ := invoker.Redis.SetNx(context.Background(), l.configMapLockKey(), "locked", 5*time.Second)
	if ok {
		l.locked = true
	}
	return ok
}

func (l *configMapLock) Unlock() {
	if l.locked {
		_, _ = invoker.Redis.Del(context.Background(), l.configMapLockKey())
		l.locked = false
	}
}
