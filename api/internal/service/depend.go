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

var Dependence *dependence
var _ iDependence = (*dependence)(nil)

type iDependence interface {
	Sync()
	Table(iid int, database, table string) (res []view.RespTableDeps, err error)
}

type dependence struct {
}

func NewDependence() *dependence {
	return &dependence{}
}

func (d *dependence) Sync() {
	for {
		d.analysis()
		time.Sleep(time.Minute * 15)
	}
}

func (d *dependence) Table(iid int, database, table string) (res []view.RespTableDeps, err error) {
	res = make([]view.RespTableDeps, 0)
	cache := map[string]interface{}{}
	checked := make(map[string]interface{}, 0)
	for _, v := range d.loopDepsV2(iid, database, table, checked, DepSearchOpUp+DepSearchOpDown) {
		if _, ok := cache[v.Database+"."+v.Table]; ok {
			continue
		}
		cache[v.Database+"."+v.Table] = struct{}{}
		res = append(res, v)
	}
	return
}

// analysis Periodically synchronize the data of each instance
func (d *dependence) analysis() {
	// Get all the instance data
	instances, err := db.InstanceList(egorm.Conds{})
	if err != nil {
		invoker.Logger.Error("depsBatch", elog.String("step", "instances"), elog.String("error", err.Error()))
		return
	}
	for _, instance := range instances {
		op, errLoad := InstanceManager.Load(instance.ID)
		if errLoad != nil {
			invoker.Logger.Error("depsBatch", elog.String("step", "Load"), elog.String("error", errLoad.Error()))
			continue
		}
		// Try again once
		rows := op.ListSystemTable()
		if len(rows) == 0 {
			// Retry ten times
			for i := 0; i < 10; i++ {
				time.Sleep(time.Second)
				rows = op.ListSystemTable()
				if len(rows) > 0 {
					break
				}
			}
		}
		d.analysisInstance(instance.ID, rows)
	}
}

func (d *dependence) analysisInstance(iid int, rows []*view.SystemTables) {
	filter := make(map[string]*db.BigdataDepend)
	deriveUps := make(map[string][]string)
	deriveDowns := make(map[string][]string)
	for _, row := range rows {
		if strings.ToLower(row.Database) == "system" || strings.ToLower(row.Database) == "information_schema" {
			continue
		}
		downs, ups := d.parsing(row)
		downs, ups = d.symbolFiltering(downs), d.symbolFiltering(ups)
		// update derive ups
		for _, down := range downs {
			deriveUps[down] = append(deriveUps[down], row.Name())
		}
		// update derive downs
		for _, up := range ups {
			deriveDowns[up] = append(deriveDowns[up], row.Name())
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
			invoker.Logger.Error("depsBatch", elog.String("step", "repeat"), elog.String("key", item.Key()))
			continue
		}
		filter[item.Name()] = item
	}

	for databaseTable, deriveUp := range deriveUps {
		item, ok := filter[databaseTable]
		if !ok {
			continue
		}
		item.UpDepDatabaseTable = arrFilter(item.UpDepDatabaseTable, deriveUp)
	}

	for databaseTable, deriveDown := range deriveDowns {
		item, ok := filter[databaseTable]
		if !ok {
			continue
		}
		item.DownDepDatabaseTable = arrFilter(item.DownDepDatabaseTable, deriveDown)
	}

	// Bulk insert
	depends := make([]*db.BigdataDepend, 0)
	for _, depend := range filter {
		depends = append(depends, depend)
	}
	tx := invoker.Db.Begin()
	if err := db.DependsDeleteAll(tx, iid); err != nil {
		tx.Rollback()
		invoker.Logger.Error("analysisInstance", elog.String("step", "DependsDeleteAll"), elog.FieldErr(err))
		return
	}
	if err := db.DependsBatchInsert(tx, depends); err != nil {
		tx.Rollback()
		invoker.Logger.Error("analysisInstance", elog.String("step", "DependsBatchInsert"), elog.FieldErr(err))
		return
	}
	if err := tx.Commit().Error; err != nil {
		invoker.Logger.Error("analysisInstance", elog.String("step", "commit"), elog.FieldErr(err))
		return
	}
	return
}

func (d *dependence) loopDepsV2(iid int, database, table string, checked map[string]interface{}, op int) (res []view.RespTableDeps) {
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
		Deps:       databaseCutting(deps[0].DownDepDatabaseTable),
	})
	// up search
	if op&DepSearchOpUp == DepSearchOpUp {
		for _, up := range deps[0].UpDepDatabaseTable {
			dt := strings.Split(up, ".")
			if len(dt) != 2 {
				continue
			}
			res = append(res, d.loopDepsV2(iid, dt[0], dt[1], checked, DepSearchOpUp)...)
		}
	}
	// down
	if op&DepSearchOpDown == DepSearchOpDown {
		for _, down := range deps[0].DownDepDatabaseTable {
			dt := strings.Split(down, ".")
			if len(dt) != 2 {
				continue
			}
			res = append(res, d.loopDepsV2(iid, dt[0], dt[1], checked, DepSearchOpDown)...)
		}
	}
	return res
}

func (d *dependence) parsing(row *view.SystemTables) ([]string, []string) {
	downDeps := row.DownDatabaseTable
	upDeps := make([]string, 0)
	createSQL := row.CreateTableQuery
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
	if strings.Contains(createSQL, "ENGINE = Distributed") {
		a1 := strings.Split(createSQL, "ENGINE = Distributed")
		if len(a1) < 2 {
			return downDeps, upDeps
		}
		a2 := strings.Split(strings.TrimSpace(a1[1]), ",")
		if len(a2) < 2 {
			return downDeps, upDeps
		}
		database := strings.TrimSpace(strings.ReplaceAll(a2[1], "'", ""))
		table := strings.TrimSpace(strings.ReplaceAll(a2[2], "'", ""))
		upDeps = append(upDeps, fmt.Sprintf("%s.%s", database, table))
	}
	return downDeps, upDeps
}

func (d *dependence) symbolFiltering(in []string) []string {
	var res = make([]string, 0)
	for _, dep := range in {
		res = append(res, strings.ReplaceAll(dep, "`", ""))
	}
	return res
}
