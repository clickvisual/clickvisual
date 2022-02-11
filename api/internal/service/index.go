package service

import (
	"errors"
	"fmt"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kslice"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type index struct{}

// NewIndex ...
func NewIndex() *index {
	return &index{}
}

func (i *index) Diff(req view.ReqCreateIndex) (map[string]*db.Index, map[string]*db.Index, map[string]*db.Index, error) {
	conds := egorm.Conds{}
	conds["tid"] = req.Tid
	nowIndexList, err := db.IndexList(conds)
	if err != nil {
		return nil, nil, nil, err
	}
	nowIndexMap := make(map[string]*db.Index)
	nowIndexArr := make([]string, 0)
	for _, ir := range nowIndexList {
		nowIndexMap[fmt.Sprintf("%s.%d", ir.Field, ir.Typ)] = ir
		nowIndexArr = append(nowIndexArr, fmt.Sprintf("%s.%d", ir.Field, ir.Typ))
	}
	newIndexMap := make(map[string]*db.Index)
	newIndexArr := make([]string, 0)
	for _, ir := range req.Data {
		newIndexMap[fmt.Sprintf("%s.%d", ir.Field, ir.Typ)] = &db.Index{
			Tid:   req.Tid,
			Field: ir.Field,
			Typ:   ir.Typ,
			Alias: ir.Alias,
		}
		newIndexArr = append(newIndexArr, fmt.Sprintf("%s.%d", ir.Field, ir.Typ))
	}
	elog.Debug("Diff", elog.Any("newIndexArr", newIndexArr), elog.Any("nowIndexArr", nowIndexArr))
	addArr := kslice.Difference(newIndexArr, nowIndexArr)
	delArr := kslice.Difference(nowIndexArr, newIndexArr)
	elog.Debug("Diff", elog.Any("addArr", addArr), elog.Any("delArr", delArr))

	var (
		addMap = make(map[string]*db.Index)
		delMap = make(map[string]*db.Index)
	)
	for _, add := range addArr {
		if obj, ok := newIndexMap[add]; ok {
			addMap[add] = obj
		}
	}
	for _, del := range delArr {
		if obj, ok := nowIndexMap[del]; ok {
			delMap[del] = obj
		}
	}
	elog.Debug("Diff", elog.Any("addMap", addMap), elog.Any("delMap", delMap), elog.Any("newIndexMap", newIndexMap))

	return addMap, delMap, newIndexMap, nil
}

func (i *index) Sync(req view.ReqCreateIndex, adds map[string]*db.Index, dels map[string]*db.Index, newList map[string]*db.Index) (err error) {
	tx := invoker.Db.Begin()
	err = db.IndexDeleteBatch(tx, req.Tid)
	if err != nil {
		tx.Rollback()
		return
	}
	for _, d := range req.Data {
		err = db.IndexCreate(tx, &db.Index{
			Tid:   req.Tid,
			Field: d.Field,
			Typ:   d.Typ,
			Alias: d.Alias,
		})
		if err != nil {
			tx.Rollback()
			return
		}
	}
	// do clickhouse operator
	tableInfo, _ := db.TableInfo(tx, req.Tid)
	databaseInfo, _ := db.DatabaseInfo(tx, tableInfo.Did)
	op, err := InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		tx.Rollback()
		return errors.New("Corresponding configuration instance does not exist:  ")
	}
	elog.Debug("IndexUpdate", elog.Any("newList", newList))

	err = op.IndexUpdate(req, databaseInfo, tableInfo, adds, dels, newList)
	if err != nil {
		tx.Rollback()
		return
	}
	// If the commit fails, the clickhouse operation is not rolled back
	if err = tx.Commit().Error; err != nil {
		elog.Error("Fatal", elog.String("error", err.Error()), elog.Any("step", "clickhouse db struct can't rollback"))
		return
	}
	return
}
