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

const (
	DepSearchOpUp   = 1 << 0
	DepSearchOpDown = 1 << 1
)

func DoDepsSync() {
	DepsBatch()
	for {
		time.Sleep(time.Minute * 15)
		// depsClear()
		DepsBatch()
	}
}

func depsClear() {
	err := db.DependsDeleteTimeout(invoker.Db)
	if err != nil {
		invoker.Logger.Error("depsClear", elog.String("error", err.Error()))
	}
}

// DepsBatch Periodically synchronize the data of each instance
func DepsBatch() {
	// Get all the instance data
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
		rows := op.SystemTablesInfo()
		if len(rows) == 0 {
			for i := 0; i < 10; i++ {
				time.Sleep(time.Second)
				rows = op.SystemTablesInfo()
				if len(rows) > 0 {
					break
				}
			}
		}
		depsInstance(instance.ID, rows)
	}
}

func depsInstance(iid int, rows []*view.SystemTable) {
	if err := db.DependsDeleteAll(invoker.Db, iid); err != nil {
		invoker.Logger.Error("DepsBatch", elog.String("step", "DependsDeleteAll"), elog.String("error", err.Error()))
		return
	}
	filter := make(map[string]*db.BigdataDepend)
	// stdout_2_ts_view ["dev_0801.stdout_2"]
	deriveUps := make(map[string][]string)
	for _, row := range rows {
		if strings.ToLower(row.Database) == "system" || strings.ToLower(row.Database) == "information_schema" {
			continue
		}
		downs, ups := customDepsParsing(row)
		// update derive ups
		for _, down := range downs {
			deriveUps[down] = append(deriveUps[down], row.Name())
		}
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
		if _, ok := filter[item.Name()]; ok {
			invoker.Logger.Error("DepsBatch", elog.String("step", "repeat"), elog.String("key", item.Key()))
			continue
		}
		filter[item.Name()] = item
	}

	for databaseTable, deriveUp := range deriveUps {
		item, ok := filter[databaseTable]
		if !ok {
			continue
		}
		item.UpDepDatabaseTable = arrayFilter(item.UpDepDatabaseTable, deriveUp)
	}

	// Bulk insert
	depends := make([]*db.BigdataDepend, 0)
	for _, depend := range filter {
		depends = append(depends, depend)
	}
	err := db.DependsBatchInsert(invoker.Db, depends)
	if err != nil {
		invoker.Logger.Error("depsInstance", elog.String("step", "DependsBatchInsert"), elog.String("error", err.Error()))
		return
	}
	return

}

func arrayFilter(source, target []string) []string {
	res := make([]string, 0)
	filter := make(map[string]interface{})
	for _, v := range source {
		filter[v] = struct{}{}
	}
	for _, v := range target {
		filter[v] = struct{}{}
	}
	for k, _ := range filter {
		res = append(res, k)
	}
	return res
}

func TableDeps(iid int, database, table string) (res []view.RespTableDeps, err error) {
	res = make([]view.RespTableDeps, 0)
	cache := map[string]interface{}{}
	checked := make(map[string]interface{}, 0)
	for _, v := range loopDepsV2(iid, database, table, checked, DepSearchOpUp+DepSearchOpDown) {
		if _, ok := cache[v.Database+"."+v.Table]; ok {
			continue
		}
		cache[v.Database+"."+v.Table] = struct{}{}
		res = append(res, v)
	}
	return
}

func loopDepsV2(iid int, database, table string, checked map[string]interface{}, op int) (res []view.RespTableDeps) {
	res = make([]view.RespTableDeps, 0)
	conds := egorm.Conds{}
	conds["iid"] = iid
	conds["table"] = table
	conds["database"] = database
	deps, _ := db.DependsList(conds)
	if len(deps) != 1 {
		return res
	}
	// get current table dependencies info
	if _, ok := checked[deps[0].Name()]; ok {
		return res
	}
	checked[deps[0].Name()] = struct{}{}
	res = append(res, view.RespTableDeps{
		Database:   deps[0].Database,
		Table:      deps[0].Table,
		Engine:     deps[0].Engine,
		TotalRows:  deps[0].Rows,
		TotalBytes: deps[0].Bytes,
		Deps:       cutDatabase(deps[0].DownDepDatabaseTable),
	})
	// up search
	if op&DepSearchOpUp == DepSearchOpUp {
		for _, up := range deps[0].UpDepDatabaseTable {
			dt := strings.Split(up, ".")
			if len(dt) != 2 {
				continue
			}
			res = append(res, loopDepsV2(iid, dt[0], dt[1], checked, DepSearchOpUp)...)
		}
	}
	// down
	if op&DepSearchOpDown == DepSearchOpDown {
		for _, down := range deps[0].DownDepDatabaseTable {
			dt := strings.Split(down, ".")
			if len(dt) != 2 {
				continue
			}
			res = append(res, loopDepsV2(iid, dt[0], dt[1], checked, DepSearchOpDown)...)
		}
	}
	return res
}

//
// func loopDeps(iid int, database, table string, checked map[string]interface{}) (res []view.RespTableDeps) {
// 	res = make([]view.RespTableDeps, 0)
// 	conds := egorm.Conds{}
// 	conds["iid"] = iid
// 	conds["database"] = database
// 	conds["table"] = table
// 	deps, _ := db.DependsList(conds)
// 	var nextDeps []string
// 	for _, row := range deps {
// 		// flushes into Downs
// 		ups, _ := db.DependsUpsList(invoker.Db, iid, database, table)
// 		row.DownDepDatabaseTable = addDatabaseTable(ups, row.DownDepDatabaseTable)
// 		invoker.Logger.Debug("loopDeps", elog.String("step", "ups"), elog.Any("ups", ups), elog.Any("DownDepDatabaseTable", row.DownDepDatabaseTable))
// 		nextDeps = append(nextDeps, row.DownDepDatabaseTable...)
// 		res = append(res, view.RespTableDeps{
// 			Database:   row.Database,
// 			Table:      row.Table,
// 			Engine:     row.Engine,
// 			TotalRows:  row.Rows,
// 			TotalBytes: row.Bytes,
// 			Deps:       cutDatabase(row.DownDepDatabaseTable),
// 		})
// 		invoker.Logger.Debug("loopDeps", elog.Any("database", database), elog.Any("table", table))
// 		res = append(res, addRespTableDeps(row.Iid, database, table, row.UpDepDatabaseTable, res)...)
// 	}
//
// 	var filterNextDeps []string
// 	for _, dependsTableName := range nextDeps {
// 		if _, ok := checked[dependsTableName]; ok {
// 			continue
// 		}
// 		filterNextDeps = append(filterNextDeps, dependsTableName)
// 	}
// 	invoker.Logger.Debug("loopDeps", elog.Any("nextDeps", nextDeps),
// 		elog.Any("filterNextDeps", filterNextDeps),
// 		elog.Any("database", database),
// 		elog.Any("table", table),
// 		elog.Any("checked", checked),
// 		elog.Any("res", res),
// 	)
// 	for _, nextTable := range filterNextDeps {
// 		dt := strings.Split(nextTable, ".")
// 		if len(dt) != 2 {
// 			continue
// 		}
// 		res = append(res, loopDeps(iid, dt[0], dt[1], checked)...)
// 	}
// 	return res
// }

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
