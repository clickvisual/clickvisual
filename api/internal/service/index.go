package service

import (
	"errors"
	"fmt"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"
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
		key := fmt.Sprintf("%s.%d", ir.Field, ir.Typ)
		if ir.RootName != "" {
			key = fmt.Sprintf("%s|%s.%d", ir.RootName, ir.Field, ir.Typ)
		}
		nowIndexMap[key] = ir
		nowIndexArr = append(nowIndexArr, key)
	}
	newIndexMap := make(map[string]*db.Index)
	newIndexArr := make([]string, 0)
	for _, ir := range req.Data {
		key := fmt.Sprintf("%s.%d", ir.Field, ir.Typ)
		if ir.RootName != "" {
			key = fmt.Sprintf("%s|%s.%d", ir.RootName, ir.Field, ir.Typ)
		}
		newIndexMap[key] = &db.Index{
			Tid:      req.Tid,
			Field:    ir.Field,
			Typ:      ir.Typ,
			Alias:    ir.Alias,
			RootName: ir.RootName,
		}
		newIndexArr = append(newIndexArr, key)
	}
	invoker.Logger.Debug("Diff", elog.Any("newIndexArr", newIndexArr), elog.Any("nowIndexArr", nowIndexArr))
	addArr := kslice.Difference(newIndexArr, nowIndexArr)
	delArr := kslice.Difference(nowIndexArr, newIndexArr)
	invoker.Logger.Debug("Diff", elog.Any("addArr", addArr), elog.Any("delArr", delArr))

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
	invoker.Logger.Debug("Diff", elog.Any("addMap", addMap), elog.Any("delMap", delMap), elog.Any("newIndexMap", newIndexMap))

	return addMap, delMap, newIndexMap, nil
}

// Sync ...
// 1. Prefer clickhouse operation
// 2. Alert Delete or Create
// 3. Drop View
// 4. Create View
func (i *index) Sync(req view.ReqCreateIndex, adds map[string]*db.Index, dels map[string]*db.Index, newList map[string]*db.Index) (err error) {
	tx := invoker.Db.Begin()
	err = db.IndexDeleteBatch(tx, req.Tid)
	if err != nil {
		tx.Rollback()
		return
	}
	for _, d := range req.Data {
		err = db.IndexCreate(tx, &db.Index{
			Tid:      req.Tid,
			Field:    d.Field,
			Typ:      d.Typ,
			Alias:    d.Alias,
			RootName: d.RootName,
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
		return errors.New("corresponding configuration instance does not exist")
	}
	invoker.Logger.Debug("IndexUpdate", elog.Any("newList", newList))
	// err = op.IndexUpdate(databaseInfo, tableInfo, adds, dels, newList)
	err = op.IndexUpdate(databaseInfo, tableInfo, filterInnerField(adds), filterInnerField(dels), filterInnerField(newList))
	if err != nil {
		tx.Rollback()
		return
	}
	// If the commit fails, the clickhouse operation is not rolled back
	if err = tx.Commit().Error; err != nil {
		invoker.Logger.Error("Fatal", elog.String("error", err.Error()), elog.Any("step", "clickhouse db struct can't rollback"))
		return
	}
	return
}

func filterInnerField(input map[string]*db.Index) (out map[string]*db.Index) {
	out = make(map[string]*db.Index)
	for key, val := range input {
		if isInnerField(val.Field) {
			continue
		}
		out[key] = val
	}
	return out
}

func isInnerField(input string) bool {
	innerFieldMap := make(map[string]interface{}, 0)
	for _, hidden := range econf.GetStringSlice("app.hiddenFields") {
		innerFieldMap[hidden] = struct{}{}
	}
	for _, show := range econf.GetStringSlice("app.defaultFields") {
		innerFieldMap[show] = struct{}{}
	}
	if _, ok := innerFieldMap[input]; ok {
		return true
	}
	return false
}
