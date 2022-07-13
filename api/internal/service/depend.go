package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func DoDepsSync() {
	DepsBatch(true)
	for {
		time.Sleep(time.Minute)
		DepsBatch(false)
	}
}

func depsClear() {
	err := db.DependsDeleteTimeout(invoker.Db)
	if err != nil {
		invoker.Logger.Error("depsClear", elog.String("error", err.Error()))
	}
}

// DepsBatch Periodically synchronize the data of each instance
func DepsBatch(isReset bool) {
	// 获取全部实例数据
	instances, err := db.InstanceList(egorm.Conds{})
	if err != nil {
		invoker.Logger.Error("DepsBatch", elog.String("step", "instances"), elog.String("error", err.Error()))
		return
	}
	for _, instance := range instances {
		op, errLoad := InstanceManager.Load(instance.ID)
		if errLoad != nil {
			invoker.Logger.Error("DepsBatch", elog.String("step", "Load"), elog.String("error", errLoad.Error()))
			continue
		}
		// Try again once
		rows := op.SystemTablesInfo(isReset)
		if isReset && len(rows) == 0 {
			for i := 0; i < 10; i++ {
				time.Sleep(time.Second)
				rows = op.SystemTablesInfo(isReset)
				if len(rows) > 0 {
					break
				}
			}
		}
		depsInstance(instance.ID, rows, isReset)
	}
}

func depsInstance(iid int, rows []*view.SystemTable, isReset bool) {
	if isReset {
		if err := db.DependsDeleteAll(invoker.Db, iid); err != nil {
			invoker.Logger.Error("DepsBatch", elog.String("step", "DependsDeleteAll"), elog.String("error", err.Error()))
			return
		}
		filter := make(map[string]interface{})
		// 批量插入
		depends := make([]*db.BigdataDepend, 0)
		for _, row := range rows {
			if strings.ToLower(row.Database) == "system" || strings.ToLower(row.Database) == "information_schema" {
				continue
			}
			downs, ups := customDepsParsing(row)
			item := &db.BigdataDepend{
				Iid:                  iid,
				Database:             row.Database,
				Table:                row.Table,
				Engine:               row.Engine,
				DownDepDatabaseTable: downs,
				UpDepDatabaseTable:   ups,
				Rows:                 row.TotalRows,
				Bytes:                row.TotalBytes,
			}
			if _, ok := filter[item.Key()]; ok {
				invoker.Logger.Error("DepsBatch", elog.String("step", "repeat"), elog.String("key", item.Key()))
				continue
			}
			filter[item.Key()] = struct{}{}
			depends = append(depends, item)
		}
		err := db.DependsBatchInsert(invoker.Db, depends)
		if err != nil {
			invoker.Logger.Error("depsInstance", elog.String("step", "DependsBatchInsert"), elog.String("error", err.Error()))
			return
		}
		return
	}
	for _, row := range rows {
		downs, ups := customDepsParsing(row)
		if err := db.DependsCreateOrUpdate(invoker.Db, &db.BigdataDepend{
			Iid:                  iid,
			Database:             row.Database,
			Table:                row.Table,
			Engine:               row.Engine,
			DownDepDatabaseTable: downs,
			UpDepDatabaseTable:   ups,
			Rows:                 row.TotalRows,
			Bytes:                row.TotalBytes,
		}); err != nil {
			invoker.Logger.Error("doDependSyncInstance", elog.String("error", err.Error()))
			continue
		}
	}
}

func TableDeps(iid int, database, table string) (res []view.RespTableDeps, err error) {
	res = make([]view.RespTableDeps, 0)
	cache := map[string]interface{}{}
	checked := make(map[string]interface{}, 0)
	for _, v := range loopDeps(iid, database, table, checked) {
		if _, ok := cache[v.Database+"."+v.Table]; ok {
			continue
		}
		cache[v.Database+"."+v.Table] = struct{}{}
		res = append(res, v)
	}
	return
}

func loopDeps(iid int, database, table string, checked map[string]interface{}) (res []view.RespTableDeps) {
	res = make([]view.RespTableDeps, 0)
	conds := egorm.Conds{}
	conds["iid"] = iid
	conds["database"] = database
	conds["table"] = table
	deps, _ := db.DependsList(conds)
	var nextDeps []string
	for _, row := range deps {
		// flushes into Downs
		ups, _ := db.DependsUpsList(invoker.Db, iid, database, table)
		row.DownDepDatabaseTable = addDatabaseTable(ups, row.DownDepDatabaseTable)
		invoker.Logger.Debug("loopDeps", elog.String("step", "ups"), elog.Any("ups", ups), elog.Any("DownDepDatabaseTable", row.DownDepDatabaseTable))
		nextDeps = append(nextDeps, row.DownDepDatabaseTable...)
		res = append(res, view.RespTableDeps{
			Database:   row.Database,
			Table:      row.Table,
			Engine:     row.Engine,
			TotalRows:  row.Rows,
			TotalBytes: row.Bytes,
			Deps:       cutDatabase(row.DownDepDatabaseTable),
		})
		invoker.Logger.Debug("addRespTableDeps", elog.Any("database", database), elog.Any("table", table))
		res = append(res, addRespTableDeps(row.Iid, database, table, row.UpDepDatabaseTable, res)...)
	}

	var filterNextDeps []string
	for _, dependsTableName := range nextDeps {
		if _, ok := checked[dependsTableName]; ok {
			continue
		}
		filterNextDeps = append(filterNextDeps, dependsTableName)
	}
	invoker.Logger.Debug("loopDeps", elog.Any("nextDeps", nextDeps),
		elog.Any("filterNextDeps", filterNextDeps),
		elog.Any("database", database),
		elog.Any("table", table),
		elog.Any("checked", checked),
		elog.Any("res", res),
	)
	for _, nextTable := range filterNextDeps {
		dt := strings.Split(nextTable, ".")
		if len(dt) != 2 {
			continue
		}
		res = append(res, loopDeps(iid, dt[0], dt[1], checked)...)
	}
	return res
}

func cutDatabase(input []string) (output []string) {
	output = make([]string, 0)
	for _, row := range input {
		rowArr := strings.Split(row, ".")
		if len(rowArr) != 2 {
			continue
		}
		output = append(output, rowArr[1])
	}
	return
}

func addDatabaseTable(deps []*db.BigdataDepend, rows []string) []string {
	rowsMap := make(map[string]interface{})
	for _, row := range rows {
		rowsMap[row] = struct{}{}
	}
	for _, dep := range deps {
		dt := fmt.Sprintf("%s.%s", dep.Database, dep.Table)
		if _, ok := rowsMap[dt]; ok {
			continue
		}
		rows = append(rows, dt)
	}
	return rows
}

func addRespTableDeps(iid int, database, table string, ups []string, respTableDeps []view.RespTableDeps) []view.RespTableDeps {
	out := make([]view.RespTableDeps, 0)
	respTableDepMap := make(map[string]interface{})
	for _, row := range respTableDeps {
		respTableDepMap[row.Name()] = struct{}{}
	}
	invoker.Logger.Debug("addRespTableDeps", elog.Any("ups", ups))
	for _, upDepDatabaseTable := range ups {
		invoker.Logger.Debug("addRespTableDeps", elog.Any("upDepDatabaseTable", upDepDatabaseTable))
		dts := strings.Split(upDepDatabaseTable, ".")
		if len(dts) != 2 {
			continue
		}
		if database == dts[0] && table == dts[1] {
			continue
		}
		conds := egorm.Conds{}
		conds["iid"] = iid
		conds["database"] = dts[0]
		conds["table"] = dts[1]
		dep, err := db.DependsInfoX(conds)
		if err != nil {
			invoker.Logger.Error("loopDeps", elog.String("step", "addRespTableDeps"), elog.Any("error", err.Error()))
			continue
		}
		invoker.Logger.Debug("addRespTableDeps", elog.Any("dep", dep), elog.Any("respTableDepMap", respTableDepMap))
		if _, ok := respTableDepMap[dep.Name()]; ok {
			continue
		}
		respTableDepMap[dep.Name()] = struct{}{}
		dep.DownDepDatabaseTable = append(dep.DownDepDatabaseTable, fmt.Sprintf("%s.%s", database, table))
		out = append(out, view.RespTableDeps{
			Database:   dep.Database,
			Table:      dep.Table,
			Engine:     dep.Engine,
			TotalRows:  dep.Rows,
			TotalBytes: dep.Bytes,
			Deps:       cutDatabase(dep.DownDepDatabaseTable),
		})
		invoker.Logger.Debug("addRespTableDeps", elog.Any("out", out), elog.Any("dep", dep))
	}
	return out
}

func customDepsParsing(row *view.SystemTable) ([]string, []string) {
	downDeps := row.DownDatabaseTable
	upDeps := make([]string, 0)
	createSQL := row.CreateTableQuery
	// CREATE MATERIALIZED VIEW dev_nocnoc.app_stdout_view TO dev_nocnoc.app_stdout (`_time_second_` DateTime,
	// GET dev_nocnoc.app_stdout
	if strings.HasPrefix(createSQL, "CREATE MATERIALIZED VIEW") {
		a1 := strings.Split(createSQL, "TO")
		if len(a1) < 2 {
			return downDeps, upDeps
		}
		a2 := strings.Split(strings.TrimSpace(a1[1]), " ")
		if len(a2) < 2 {
			return downDeps, upDeps
		}
		downDeps = append(downDeps, a2[0])
	}
	//  '创建文件数') ENGINE = Distributed('shard2-repl1', 'shard', 'dws_collaboration_7d_statistic_by_department_daily', rand())
	// GET dws_collaboration_7d_statistic_by_department_daily
	if strings.Contains(createSQL, "ENGINE = Distributed") {
		a1 := strings.Split(createSQL, "ENGINE = Distributed")
		if len(a1) < 2 {
			return downDeps, upDeps
		}
		a2 := strings.Split(strings.TrimSpace(a1[1]), ",")
		if len(a2) < 2 {
			return downDeps, upDeps
		}
		d := strings.TrimSpace(strings.ReplaceAll(a2[1], "'", ""))
		t := strings.TrimSpace(strings.ReplaceAll(a2[2], "'", ""))
		upDeps = append(upDeps, fmt.Sprintf("%s.%s", d, t))
	}
	return downDeps, upDeps
}
