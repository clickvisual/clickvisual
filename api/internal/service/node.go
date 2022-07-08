package service

import (
	"fmt"
	"time"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/node"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func NodeRun(nodeId, uid int) (res view.RespRunNode, err error) {
	n, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	if n.LockUid != uid {
		err = errors.New("please get the node lock and try again")
		return
	}
	nc, err := db.NodeContentInfo(invoker.Db, n.ID)
	if err != nil {
		return
	}
	res, err = node.Operator(&n, &nc, node.OperatorRun)
	if err != nil {
		return
	}
	afterNodeInfo, err := db.NodeInfo(invoker.Db, nodeId)
	if err != nil {
		return
	}
	res.Status = afterNodeInfo.Status
	return
}

func NodeTryLock(uid, configId int) (err error) {
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
