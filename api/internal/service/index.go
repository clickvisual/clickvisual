package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/kutl"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type index struct{}

// NewIndex ...
func NewIndex() *index {
	return &index{}
}

func (i *index) Diff(req view.ReqCreateIndex) (map[string]*db.BaseIndex, map[string]*db.BaseIndex, map[string]*db.BaseIndex, error) {
	conds := egorm.Conds{}
	conds["tid"] = req.Tid
	nowIndexList, err := db.IndexList(conds)
	if err != nil {
		return nil, nil, nil, err
	}
	nowIndexMap := make(map[string]*db.BaseIndex)
	nowIndexArr := make([]string, 0)
	for _, ir := range nowIndexList {
		key := fmt.Sprintf("%s.%d.%d", ir.Field, ir.Typ, ir.HashTyp)
		if ir.RootName != "" {
			key = fmt.Sprintf("%s|%s.%d.%d", ir.RootName, ir.Field, ir.Typ, ir.HashTyp)
		}
		nowIndexMap[key] = ir
		nowIndexArr = append(nowIndexArr, key)
	}
	newIndexMap := make(map[string]*db.BaseIndex)
	newIndexArr := make([]string, 0)
	for _, ir := range req.Data {
		key := fmt.Sprintf("%s.%d.%d", ir.Field, ir.Typ, ir.HashTyp)
		if ir.RootName != "" {
			key = fmt.Sprintf("%s|%s.%d.%d", ir.RootName, ir.Field, ir.Typ, ir.HashTyp)
		}
		newIndexMap[key] = &db.BaseIndex{
			Tid:      req.Tid,
			Field:    ir.Field,
			Typ:      ir.Typ,
			Alias:    ir.Alias,
			RootName: ir.RootName,
			HashTyp:  ir.HashTyp,
		}
		newIndexArr = append(newIndexArr, key)
	}
	invoker.Logger.Debug("Diff", elog.Any("newIndexArr", newIndexArr), elog.Any("nowIndexArr", nowIndexArr))
	addArr := kutl.Difference(newIndexArr, nowIndexArr)
	delArr := kutl.Difference(nowIndexArr, newIndexArr)
	invoker.Logger.Debug("Diff", elog.Any("addArr", addArr), elog.Any("delArr", delArr))

	var (
		addMap = make(map[string]*db.BaseIndex)
		delMap = make(map[string]*db.BaseIndex)
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
// 3. Drop BaseView
// 4. Create BaseView
func (i *index) Sync(req view.ReqCreateIndex, adds map[string]*db.BaseIndex, dels map[string]*db.BaseIndex, newList map[string]*db.BaseIndex) (err error) {
	tx := invoker.Db.Begin()
	err = db.IndexDeleteBatch(tx, req.Tid)
	if err != nil {
		tx.Rollback()
		return
	}
	for _, d := range req.Data {
		err = db.IndexCreate(tx, &db.BaseIndex{
			Tid:      req.Tid,
			Field:    d.Field,
			Typ:      d.Typ,
			Alias:    d.Alias,
			RootName: d.RootName,
			HashTyp:  d.HashTyp,
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
	err = op.IndexUpdate(databaseInfo, tableInfo, filterSystemField(adds, req.Tid), filterSystemField(dels, req.Tid), filterSystemField(newList, req.Tid))
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

func filterSystemField(input map[string]*db.BaseIndex, tid int) (out map[string]*db.BaseIndex) {
	out = make(map[string]*db.BaseIndex)
	ifm := innerFieldMap(tid)
	for key, val := range input {
		if _, ok := ifm[val.Field]; ok {
			continue
		}
		out[key] = val
	}
	return out
}

func innerFieldMap(tid int) map[string]interface{} {
	resp := make(map[string]interface{}, 0)
	for _, hidden := range econf.GetStringSlice("app.hiddenFields") {
		resp[hidden] = struct{}{}
	}
	for _, show := range econf.GetStringSlice("app.defaultFields") {
		resp[show] = struct{}{}
	}
	table, _ := db.TableInfo(invoker.Db, tid)
	for _, key := range strings.Split(table.SelectFields, ",") {
		resp[strings.Replace(key, "`", "", -1)] = struct{}{}
	}
	return resp
}
