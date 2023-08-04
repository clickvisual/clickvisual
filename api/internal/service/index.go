package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/cetus/pkg/kutl"
	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
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
	conds["kind"] = db.IndexKindLog
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
	addArr := kutl.Difference(newIndexArr, nowIndexArr)
	delArr := kutl.Difference(nowIndexArr, newIndexArr)

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
	return addMap, delMap, newIndexMap, nil
}

// Sync ...
// 1. Prefer clickhouse operation
// 2. Alert Delete or Create
// 3. Drop BaseView
// 4. Create BaseView
func (i *index) Sync(req view.ReqCreateIndex, adds map[string]*db.BaseIndex, dels map[string]*db.BaseIndex, newList map[string]*db.BaseIndex) (err error) {
	tx := invoker.Db.Begin()
	err = db.IndexDeleteBatch(tx, req.Tid, false)
	if err != nil {
		tx.Rollback()
		return
	}
	for _, d := range req.Data {
		err = db.IndexCreate(tx, &db.BaseIndex{
			Tid:   req.Tid,
			Field: d.Field,
			Typ:   d.Typ,

			Alias:    d.Alias,
			RootName: d.RootName,
			HashTyp:  d.HashTyp,
			Kind:     db.IndexKindLog,
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
	// If the commit fails, the clickhouse operation is not rolled back
	if err = tx.Commit().Error; err != nil {
		elog.Error("Fatal", elog.String("error", err.Error()), elog.Any("step", "clickhouse db struct can't rollback"))
		return
	}
	// 异步处理
	xgo.Go(func() {
		err = op.UpdateLogAnalysisFields(databaseInfo, tableInfo, filterSystemField(tableInfo.CreateType, adds, req.Tid), filterSystemField(tableInfo.CreateType, dels, req.Tid), filterSystemField(tableInfo.CreateType, newList, req.Tid))
		if err != nil {
			elog.Error("Fatal", l.E(err), l.S("step", "UpdateLogAnalysisFieldsFail"))
			return
		}
	})
	return
}

func filterSystemField(createType int, input map[string]*db.BaseIndex, tid int) (out map[string]*db.BaseIndex) {
	out = make(map[string]*db.BaseIndex)
	var ifm map[string]interface{}
	if createType == constx.TableCreateTypeUBW {
		ifm = constx.DefaultFields
	} else {
		ifm = innerFieldMap(tid)
	}
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
