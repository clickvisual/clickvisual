package service

import (
	"fmt"
	"time"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func NodeTryLock(uid, configId int, isForced bool) (err error) {
	var n db.BigdataNode
	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&n).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}
		if !isForced {
			if n.LockUid != 0 && n.LockUid != uid {
				tx.Rollback()
				return fmt.Errorf("failed to release the edit lock because another client is currently editing")
			}
		}
		err = tx.Model(&db.BigdataNode{}).Where("id = ?", n.ID).Updates(map[string]interface{}{
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
	var n db.BigdataNode
	tx := invoker.Db.Begin()
	{
		err = tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", configId).First(&n).Error
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("configuration does not exist")
		}
		if n.LockUid != 0 && n.LockUid != uid {
			tx.Rollback()
			return fmt.Errorf("failed to release the edit lock because another client is currently editing")
		}
		err = tx.Model(&db.BigdataNode{}).Where("id = ?", n.ID).Updates(map[string]interface{}{
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

func NodeResultRespAssemble(nr *db.BigdataNodeResult) view.RespNodeResult {
	res := view.RespNodeResult{
		ID:      nr.ID,
		Ctime:   nr.Ctime,
		NodeId:  nr.NodeId,
		Content: nr.Content,
		Result:  nr.Result,
		Cost:    nr.Cost,
	}
	if nr.Uid == -1 {
		res.RespUserSimpleInfo = view.RespUserSimpleInfo{
			Uid:      -1,
			Username: "Crontab",
			Nickname: "Crontab",
		}
	} else {
		u, _ := db.UserInfo(nr.Uid)
		res.RespUserSimpleInfo.Gen(u)
	}
	return res
}
