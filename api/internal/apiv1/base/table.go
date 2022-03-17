package base

import (
	"sort"
	"sync"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kfloat"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/internal/service/inquiry"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func TableId(c *core.Context) {
	var param view.ReqTableId
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	condsIns := egorm.Conds{}
	condsIns["name"] = param.Instance
	condsIns["datasource"] = param.Datasource
	instance, err := db.InstanceInfoX(invoker.Db, condsIns)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	condsDb := egorm.Conds{}
	condsDb["iid"] = instance.ID
	condsDb["name"] = param.Database
	databaseInfo, err := db.DatabaseInfoX(invoker.Db, condsDb)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	condsTb := egorm.Conds{}
	condsTb["did"] = databaseInfo.ID
	condsTb["name"] = param.Table
	tableInfo, err := db.TableInfoX(invoker.Db, condsTb)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	c.JSONOK(tableInfo.ID)
}

func TableCreate(c *core.Context) {
	did := cast.ToInt(c.Param("did"))
	if did == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	var param view.ReqTableCreate
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	databaseInfo, err := db.DatabaseInfo(invoker.Db, did)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	op, err := service.InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	s, d, v, err := op.TableCreate(did, databaseInfo.Name, param)
	if err != nil {
		c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
		return
	}
	err = db.TableCreate(invoker.Db, &db.Table{
		Did:        did,
		Name:       param.TableName,
		Typ:        param.Typ,
		Days:       param.Days,
		Brokers:    param.Brokers,
		Topic:      param.Topics,
		SqlData:    d,
		SqlStream:  s,
		SqlView:    v,
		TimeField:  inquiry.TimeField,
		CreateType: inquiry.TableCreateTypeMogo,
		Uid:        c.Uid(),
	})
	if err != nil {
		c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func TableInfo(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, err := db.TableInfo(invoker.Db, tid)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	instance, err := db.InstanceInfo(invoker.Db, tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	res := view.RespTableDetail{
		Did:     tableInfo.Did,
		Name:    tableInfo.Name,
		Typ:     tableInfo.Typ,
		Days:    tableInfo.Days,
		Brokers: tableInfo.Brokers,
		Topic:   tableInfo.Topic,
		Uid:     tableInfo.Uid,
		Database: view.RespDatabaseItem{
			Id:             tableInfo.Database.ID,
			Iid:            tableInfo.Database.Iid,
			Name:           tableInfo.Database.Name,
			Uid:            tableInfo.Database.Uid,
			DatasourceType: instance.Datasource,
			InstanceName:   instance.Name,
		},
	}
	keys := make([]string, 0)
	data := make(map[string]string, 0)
	keys = append(keys, "data_sql", "stream_sql", "view_sql")
	data["data_sql"] = tableInfo.SqlData
	data["stream_sql"] = tableInfo.SqlStream
	data["view_sql"] = tableInfo.SqlView
	conds := egorm.Conds{}
	conds["tid"] = tableInfo.ID
	viewList, err := db.ViewList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, "view sql read failed: "+err.Error(), nil)
		return
	}
	for _, v := range viewList {
		keys = append(keys, v.Name+"_view_sql")
		data[v.Name+"_view_sql"] = v.SqlView
	}
	res.SQLContent.Keys = keys
	res.SQLContent.Data = data
	c.JSONOK(res)
	return
}

func TableList(c *core.Context) {
	did := int64(cast.ToInt(c.Param("did")))
	if did == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	conds := egorm.Conds{}
	conds["did"] = did
	tableList, err := db.TableList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	res := make([]view.RespTableSimple, 0)
	for _, row := range tableList {
		res = append(res, view.RespTableSimple{
			Id:         row.ID,
			TableName:  row.Name,
			CreateType: row.CreateType,
		})
	}
	c.JSONOK(res)
	return
}

func TableDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	tableInfo, err := db.TableInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, "delete failed: "+err.Error(), nil)
		return
	}
	if tableInfo.ID == 0 {
		c.JSONE(core.CodeErr, "Unable to delete tables not created by Mogo.", nil)
		return
	}
	// check if these is some alarms on this table
	conds := egorm.Conds{}
	conds["tid"] = tableInfo.ID
	alarms, err := db.AlarmList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, "delete failed 02: "+err.Error(), nil)
		return
	}
	if len(alarms) > 0 {
		c.JSONE(core.CodeErr, "you should delete all alarms before delete table.", nil)
		return
	}

	tx := invoker.Db.Begin()
	err = db.TableDelete(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed 03: "+err.Error(), nil)
		return
	}
	err = db.ViewDeleteByTableID(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed 04: "+err.Error(), nil)
		return
	}
	err = db.IndexDeleteBatch(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed 05: "+err.Error(), nil)
		return
	}
	if tableInfo.CreateType == inquiry.TableCreateTypeMogo {
		table := tableInfo.Name
		iid := tableInfo.Database.Iid
		database := tableInfo.Database.Name
		op, errLoad := service.InstanceManager.Load(iid)
		if errLoad != nil {
			tx.Rollback()
			c.JSONE(core.CodeErr, errLoad.Error(), nil)
			return
		}
		err = op.TableDrop(database, table, tableInfo.ID)
		if err != nil {
			tx.Rollback()
			c.JSONE(core.CodeErr, "delete failed 01: "+err.Error(), nil)
			return
		}
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, "delete failed 06: "+err.Error(), nil)
		return
	}
	c.JSONOK("delete succeeded. Note that Kafka may be backlogged.")
}

func TableLogs(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db.TableInfo(invoker.Db, id)
	// default time field
	if tableInfo.TimeField == "" {
		param.TimeField = inquiry.TimeField
	} else {
		param.TimeField = tableInfo.TimeField
	}
	param.Table = tableInfo.Name
	param.Database = tableInfo.Database.Name
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	param, err = op.Prepare(param, true)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if param.Query == "" {
		c.JSONE(core.CodeErr, "Query parameter error. Refer to the ClickHouse WHERE syntax. https://clickhouse.com/docs/zh/sql-reference/statements/select/where/", nil)
		return
	}
	res, err := op.GET(param, tableInfo.ID)
	if err != nil {
		c.JSONE(core.CodeErr, "query failed: "+err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

func TableCharts(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db.TableInfo(invoker.Db, id)
	// default time field
	if tableInfo.TimeField == "" {
		param.TimeField = inquiry.TimeField
	} else {
		param.TimeField = tableInfo.TimeField
	}
	param.Table = tableInfo.Name
	param.Database = tableInfo.Database.Name
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	// Calculate 50 intervals
	res := view.HighCharts{
		Histograms: make([]view.HighChart, 0),
	}
	param, err = op.Prepare(param, true)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	interval := (param.ET - param.ST) / 50
	isZero := true
	invoker.Logger.Debug("Charts", elog.Any("interval", interval), elog.Any("st", param.ST), elog.Any("et", param.ET))

	if interval == 0 {
		row := view.HighChart{
			Count:    op.Count(param),
			Progress: "",
			From:     param.ST,
			To:       param.ET,
		}
		if row.Count > 0 {
			isZero = false
		}
		res.Histograms = append(res.Histograms, row)
	} else {
		limiter := make(chan view.HighChart, 100)
		wg := &sync.WaitGroup{}
		for i := param.ST; i <= param.ET; i += interval {
			wg.Add(1)
			go func(st, et int64, wg *sync.WaitGroup) {
				row := view.HighChart{
					Count: op.Count(view.ReqQuery{
						Table:         param.Table,
						DatabaseTable: param.DatabaseTable,
						Query:         param.Query,
						ST:            st,
						ET:            et,
						Page:          param.Page,
						PageSize:      param.PageSize,
						TimeField:     param.TimeField,
					}),
					Progress: "",
					From:     st,
					To:       et,
				}
				if isZero && row.Count > 0 {
					isZero = false
				}
				limiter <- row
				wg.Done()
				return
			}(i, i+interval, wg)
		}
		wg.Wait()
		close(limiter)
		for d := range limiter {
			res.Histograms = append(res.Histograms, d)
		}
	}
	if isZero {
		c.JSONE(core.CodeOK, "the query data is empty", nil)
		return
	}
	sort.Slice(res.Histograms, func(i int, j int) bool {
		return res.Histograms[i].From < res.Histograms[j].From
	})
	c.JSONOK(res)
	return
}

func TableIndexes(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	tid := cast.ToInt(c.Param("id"))
	indexId := cast.ToInt(c.Param("idx"))
	if tid == 0 || indexId == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db.TableInfo(invoker.Db, tid)
	if tableInfo.TimeField == "" {
		param.TimeField = inquiry.TimeField
	} else {
		param.TimeField = tableInfo.TimeField
	}
	param.Table = tableInfo.Name
	param.Database = tableInfo.Database.Name
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}
	indexInfo, _ := db.IndexInfo(invoker.Db, indexId)
	param.Field = indexInfo.Field
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	param, err = op.Prepare(param, true)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter. "+err.Error(), nil)
		return
	}
	list := op.GroupBy(param)
	invoker.Logger.Debug("Indexes", elog.Any("list", list))

	res := make([]view.RespIndexItem, 0)
	sum := uint64(0)
	for _, row := range list {
		sum += row
	}
	for k, v := range list {
		res = append(res, view.RespIndexItem{
			IndexName: k,
			Count:     v,
			Percent:   kfloat.Decimal(float64(v) * 100 / float64(sum)),
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Count > res[j].Count
	})
	invoker.Logger.Debug("Indexes", elog.Any("res", res))
	if len(res) > 10 {
		c.JSONOK(res[:9])
		return
	}
	c.JSONOK(res)
	return
}

func TableCreateSelfBuilt(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	var param view.ReqTableCreateExist
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	// check mogo exist
	conds := egorm.Conds{}
	conds["name"] = param.DatabaseName
	existDatabases, err := db.DatabaseList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, "database create failed 01: "+err.Error(), nil)
		return
	}
	for _, existDatabase := range existDatabases {
		condsT := egorm.Conds{}
		condsT["did"] = existDatabase.ID
		existTables, errExistTables := db.TableList(invoker.Db, condsT)
		if errExistTables != nil {
			c.JSONE(core.CodeErr, "database create failed 02: "+errExistTables.Error(), nil)
			return
		}
		for _, existTable := range existTables {
			if existTable.Name == param.TableName {
				c.JSONE(core.CodeErr, "database create failed 03: this table is already exist in mogo", nil)
				return
			}
		}
	}
	tx := invoker.Db.Begin()
	databaseInfo, err := db.DatabaseGetOrCreate(tx, c.Uid(), iid, param.DatabaseName)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "database create failed: "+err.Error(), nil)
		return
	}
	// no need to operator the database
	tableInfo := db.Table{
		Did:        databaseInfo.ID,
		Name:       param.TableName,
		Uid:        c.Uid(),
		CreateType: inquiry.TableCreateTypeExist,
		TimeField:  param.TimeField,
	}
	err = db.TableCreate(tx, &tableInfo)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
		return
	}
	// create index
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	columns, err := op.Columns(param.DatabaseName, param.TableName, false)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
		return
	}
	invoker.Logger.Debug("TableCreateSelfBuilt", elog.Any("columns", columns))
	for _, col := range columns {
		if col.Type == -1 {
			continue
		}
		err = db.IndexCreate(tx, &db.Index{
			Tid:      tableInfo.ID,
			Field:    col.Name,
			Typ:      col.Type,
			Alias:    "",
			RootName: "",
		})
		if err != nil {
			tx.Rollback()
			c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
			return
		}
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func TableColumnsSelfBuilt(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	var param view.ReqTableCreateExist
	err := c.Bind(&param)
	invoker.Logger.Debug("TableColumnsSelfBuilt", elog.Any("param", param))
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	var columnsInfo struct {
		All               []*view.RespColumn `json:"all"`
		ConformToStandard []*view.RespColumn `json:"conformToStandard"`
	}
	columnsInfo.ConformToStandard, err = op.Columns(param.DatabaseName, param.TableName, true)
	if err != nil {
		c.JSONE(core.CodeErr, "database create failed: "+err.Error(), nil)
		return
	}
	columnsInfo.All, err = op.Columns(param.DatabaseName, param.TableName, false)
	if err != nil {
		c.JSONE(core.CodeErr, "database create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK(columnsInfo)
}
