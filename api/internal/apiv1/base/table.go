package base

import (
	"errors"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/kutl"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
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
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(databaseInfo.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixDatabase,
		DomainId:    strconv.Itoa(databaseInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	_, err = service.TableCreate(c.Uid(), databaseInfo, param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTablesCreate, map[string]interface{}{"param": param})
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
		c.JSONE(core.CodeErr, "this table does not exist, please verify"+err.Error(), nil)
		return
	}

	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	instance, err := db.InstanceInfo(invoker.Db, tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	res := view.RespTableDetail{
		Did:       tableInfo.Did,
		Name:      tableInfo.Name,
		Typ:       tableInfo.Typ,
		Days:      tableInfo.Days,
		Brokers:   tableInfo.Brokers,
		Topic:     tableInfo.Topic,
		Uid:       tableInfo.Uid,
		TimeField: tableInfo.TimeField,
		Ctime:     tableInfo.Ctime,
		Utime:     tableInfo.Utime,
		Desc:      tableInfo.Desc,
		Database: view.RespDatabaseItem{
			Id:             tableInfo.Database.ID,
			Iid:            tableInfo.Database.Iid,
			Name:           tableInfo.Database.Name,
			Uid:            tableInfo.Database.Uid,
			Desc:           tableInfo.Database.Desc,
			DatasourceType: instance.Datasource,
			InstanceName:   instance.Name,
			InstanceDesc:   instance.Desc,
		},
	}
	keys := make([]string, 0)
	data := make(map[string]string, 0)
	keys = append(keys, "data_sql", "stream_sql", "view_sql")
	data["data_sql"] = tableInfo.SqlData
	data["stream_sql"] = tableInfo.SqlStream
	data["view_sql"] = tableInfo.SqlView

	if tableInfo.SqlDistributed != "" {
		keys = append(keys, "distribute_sql")
		data["distribute_sql"] = tableInfo.SqlDistributed
	}

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
	res.CreateType = tableInfo.CreateType
	c.JSONOK(res)
	return
}

func TableList(c *core.Context) {
	did := cast.ToInt(c.Param("did"))
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
		if !service.InstanceManager.ReadPermissionTable(c.Uid(), row.Database.Iid, row.ID) {
			continue
		}
		res = append(res, view.RespTableSimple{
			Id:         row.ID,
			TableName:  row.Name,
			CreateType: row.CreateType,
			Desc:       row.Desc,
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
		c.JSONE(core.CodeErr, "Unable to delete tables not created by clickvisual.", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActDelete},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
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
	if tableInfo.CreateType == inquiry.TableCreateTypeCV {
		table := tableInfo.Name
		iid := tableInfo.Database.Iid
		database := tableInfo.Database.Name
		op, errLoad := service.InstanceManager.Load(iid)
		if errLoad != nil {
			tx.Rollback()
			c.JSONE(core.CodeErr, errLoad.Error(), nil)
			return
		}
		err = op.TableDrop(database, table, tableInfo.Database.Cluster, tableInfo.ID)
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
	event.Event.InquiryCMDB(c.User(), db.OpnTablesDelete, map[string]interface{}{"tableInfo": tableInfo})
	c.JSONOK("delete succeeded. Note that Kafka may be backlogged.")
}

func TableLogs(c *core.Context) {
	t := time.Now()
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
	invoker.Logger.Debug("optimize", elog.String("func", "TableLogs"), elog.String("step", "params"), elog.Any("cost", time.Since(t)))
	tableInfo, _ := db.TableInfo(invoker.Db, id)
	// default time field
	if tableInfo.TimeField == "" {
		param.TimeField = db.TimeFieldSecond
	} else {
		param.TimeField = tableInfo.TimeField
	}
	param.Tid = tableInfo.ID
	param.Table = tableInfo.Name
	param.TimeFieldType = tableInfo.TimeFieldType
	param.Database = tableInfo.Database.Name
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}

	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	invoker.Logger.Debug("optimize", elog.String("func", "TableLogs"), elog.String("step", "TableInfo"), elog.Any("cost", time.Since(t)))
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	param, err = op.Prepare(param, false)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if param.Query == "" {
		c.JSONE(core.CodeErr, "Query parameter error. Refer to the ClickHouse WHERE syntax. https://clickhouse.com/docs/zh/sql-reference/statements/select/where/", nil)
		return
	}
	invoker.Logger.Debug("optimize", elog.String("func", "TableLogs"), elog.String("step", "Prepare"), elog.Any("cost", time.Since(t)))
	res, err := op.GET(param, tableInfo.ID)
	if err != nil {
		c.JSONE(core.CodeErr, "query failed: "+err.Error(), nil)
		return
	}
	list, err := db.HiddenFieldList(egorm.Conds{"tid": egorm.Cond{
		Op:  "=",
		Val: tableInfo.ID,
	}})
	if err == nil {
		for i := range list {
			res.HiddenFields = append(res.HiddenFields, list[i].Field)
		}
	}
	invoker.Logger.Debug("optimize", elog.String("func", "TableLogs"), elog.String("step", "GET"), elog.Any("cost", time.Since(t)))
	event.Event.InquiryCMDB(c.User(), db.OpnTablesLogsQuery, map[string]interface{}{"param": param})
	c.JSONOK(res)
	return
}

func QueryComplete(c *core.Context) {
	var param view.ReqComplete
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	invoker.Logger.Debug("Complete", elog.Any("param", param))
	res, err := op.Complete(param.Query)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

func TableCharts(c *core.Context) {
	t := time.Now()
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
		param.TimeField = db.TimeFieldSecond
	} else {
		param.TimeField = tableInfo.TimeField
	}
	param.Tid = tableInfo.ID
	param.TimeFieldType = tableInfo.TimeFieldType
	param.Table = tableInfo.Name
	param.Database = tableInfo.Database.Name
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}

	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	invoker.Logger.Debug("optimize", elog.String("func", "TableCharts"), elog.String("step", "load"), elog.Any("cost", time.Since(t)))
	res := view.HighCharts{
		Histograms: make([]view.HighChart, 0),
	}
	param, err = op.Prepare(param, false)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	interval := utils.CalculateInterval(param.ET - param.ST)
	isZero := true
	invoker.Logger.Debug("Charts", elog.Any("interval", interval), elog.Any("st", param.ST), elog.Any("et", param.ET))
	if interval == 0 {
		count, errCount := op.Count(param)
		if errCount != nil {
			c.JSONE(core.CodeErr, "query error: "+errCount.Error(), nil)
			return
		}
		row := view.HighChart{
			Count:    count,
			Progress: "",
			From:     param.ST,
			To:       param.ET,
		}
		if row.Count > 0 {
			isZero = false
		}
		res.Count = row.Count
		res.Histograms = append(res.Histograms, row)
	} else {
		invoker.Logger.Debug("optimize", elog.String("func", "TableCharts"), elog.String("step", "start"), elog.Any("cost", time.Since(t)))

		limiter := make(chan view.HighChart, 100)
		errorChan := make(chan error, 100)
		wg := &sync.WaitGroup{}
		sum := 0

		for i := param.ST; i < param.ET; i += interval {
			wg.Add(1)
			sum++
			go func(st, et int64, wg *sync.WaitGroup) {
				if et > param.ET {
					et = param.ET
				}
				count, countErr := op.Count(view.ReqQuery{
					Tid:           tableInfo.ID,
					Table:         param.Table,
					DatabaseTable: param.DatabaseTable,
					Query:         param.Query,
					ST:            st,
					ET:            et,
					Page:          param.Page,
					PageSize:      param.PageSize,
					TimeField:     param.TimeField,
					TimeFieldType: param.TimeFieldType,
				})
				if countErr != nil {
					errorChan <- countErr
				}
				row := view.HighChart{
					Count:    count,
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
		invoker.Logger.Debug("optimize", elog.Int("sum", sum), elog.String("func", "TableCharts"), elog.String("step", "finish"), elog.Any("cost", time.Since(t)))
		close(errorChan)
		for e := range errorChan {
			if e != nil {
				c.JSONE(core.CodeErr, "query error: "+e.Error(), nil)
				return
			}
		}
		close(limiter)
		for d := range limiter {
			res.Histograms = append(res.Histograms, d)
			res.Count += d.Count
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
		param.TimeField = db.TimeFieldSecond
	} else {
		param.TimeField = tableInfo.TimeField
	}
	param.Table = tableInfo.Name
	param.Database = tableInfo.Database.Name
	param.TimeFieldType = tableInfo.TimeFieldType
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}
	// permission check
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	indexInfo, _ := db.IndexInfo(invoker.Db, indexId)
	param.Field = indexInfo.GetFieldName()
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	param, err = op.Prepare(param, false)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter. "+err.Error(), nil)
		return
	}
	list := op.GroupBy(param)

	invoker.Logger.Debug("Indexes", elog.Any("list", list))

	res := make([]view.RespIndexItem, 0)
	sum, err := op.Count(param)
	if err != nil {
		c.JSONE(core.CodeErr, "query error: "+err.Error(), nil)
		return
	}
	var count uint64
	for k, v := range list {
		count += v
		res = append(res, view.RespIndexItem{
			IndexName: k,
			Count:     v,
			Percent:   kutl.Decimal(float64(v) * 100 / float64(sum)),
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Count > res[j].Count
	})
	invoker.Logger.Debug("Indexes", elog.Any("res", res))
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
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	err = tableCreateSelfBuilt(c.Uid(), iid, param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTableCreateSelfBuilt, map[string]interface{}{"tableInfo": param})
	c.JSONOK()
}

func TableCreateSelfBuiltBatch(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	var params view.ReqTableCreateExistBatch
	err := c.Bind(&params)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	for _, param := range params.TableList {
		err = tableCreateSelfBuilt(c.Uid(), iid, param)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTableCreateSelfBuilt, map[string]interface{}{"tableInfo": params})
	c.JSONOK()
}

func tableCreateSelfBuilt(uid, iid int, param view.ReqTableCreateExist) error {
	// check clickvisual exist
	conds := egorm.Conds{}
	conds["iid"] = iid
	conds["name"] = param.DatabaseName
	existDatabases, err := db.DatabaseList(invoker.Db, conds)
	if err != nil {
		return errors.New("database create failed 01: " + err.Error())
	}
	for _, existDatabase := range existDatabases {
		condsT := egorm.Conds{}
		condsT["did"] = existDatabase.ID
		existTables, errExistTables := db.TableList(invoker.Db, condsT)
		if errExistTables != nil {
			return errors.New("database create failed 02: " + errExistTables.Error())
		}
		for _, existTable := range existTables {
			if existTable.Name == param.TableName {
				return errors.New("database create failed 03: this table is already exist in clickvisual")
			}
		}
	}
	tx := invoker.Db.Begin()
	databaseInfo, err := db.DatabaseGetOrCreate(tx, uid, iid, param.DatabaseName)
	if err != nil {
		tx.Rollback()
		return errors.New("database create failed: " + err.Error())
	}
	// no need to operator the database
	tableInfo := db.BaseTable{
		Did:           databaseInfo.ID,
		Name:          param.TableName,
		Uid:           uid,
		CreateType:    inquiry.TableCreateTypeExist,
		TimeField:     param.TimeField,
		TimeFieldType: param.TimeFieldType,
		Desc:          param.Desc,
	}
	err = db.TableCreate(tx, &tableInfo)
	if err != nil {
		tx.Rollback()
		return err
	}
	// create index
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		tx.Rollback()
		return err
	}
	columns, err := op.Columns(param.DatabaseName, param.TableName, false)
	if err != nil {
		tx.Rollback()
		return errors.New("create failed: " + err.Error())
	}
	invoker.Logger.Debug("TableCreateSelfBuilt", elog.Any("columns", columns))
	for _, col := range columns {
		if col.Type == -1 {
			continue
		}
		err = db.IndexCreate(tx, &db.BaseIndex{
			Tid:      tableInfo.ID,
			Field:    col.Name,
			Typ:      col.Type,
			Alias:    "",
			RootName: "",
		})
		if err != nil {
			tx.Rollback()
			return errors.New("create failed: " + err.Error())
		}
	}
	if err = tx.Commit().Error; err != nil {
		return errors.New("create failed: " + err.Error())
	}
	return nil
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

func TableUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view.ReqTableUpdate
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	table, err := db.TableInfo(invoker.Db, id)
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(table.Database.Iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["desc"] = req.Desc
	if err = db.TableUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed 01"+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnTablesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func TableDeps(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	dn := strings.TrimSpace(c.Param("dn"))
	tn := strings.TrimSpace(c.Param("tn"))
	if dn == "" || iid == 0 || tn == "" {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	res, err := service.TableDeps(iid, dn, tn)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}
