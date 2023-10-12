package base

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/kutl"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/clickhouse"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// TableId
// @Tags         LOGSTORE
// @Summary		 日志库ID获取
func TableId(c *core.Context) {
	var param view2.ReqTableId
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	condsIns := egorm.Conds{}
	condsIns["name"] = param.Instance
	condsIns["datasource"] = param.Datasource
	instance, err := db2.InstanceInfoX(invoker.Db, condsIns)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	condsDb := egorm.Conds{}
	condsDb["iid"] = instance.ID
	condsDb["name"] = param.Database
	databaseInfo, err := db2.DatabaseInfoX(invoker.Db, condsDb)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	condsTb := egorm.Conds{}
	condsTb["did"] = databaseInfo.ID
	condsTb["name"] = param.Table
	tableInfo, err := db2.TableInfoX(invoker.Db, condsTb)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	c.JSONOK(tableInfo.ID)
}

// TableCreate
// @Tags         LOGSTORE
// @Summary		 日志库创建
// func TableCreate(c *core.Context) {
// 	did := cast.ToInt(c.Param("did"))
// 	if did == 0 {
// 		c.JSONE(core.CodeErr, "params error", nil)
// 		return
// 	}
// 	var param view.ReqTableCreate
// 	err := c.Bind(&param)
// 	if err != nil {
// 		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
// 		return
// 	}
// 	databaseInfo, err := db.DatabaseInfo(invoker.Db, did)
// 	if err != nil {
// 		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
// 		return
// 	}
// 	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
// 		UserId:      c.Uid(),
// 		ObjectType:  pmsplugin.PrefixInstance,
// 		ObjectIdx:   strconv.Itoa(databaseInfo.Iid),
// 		SubResource: pmsplugin.Log,
// 		Acts:        []string{pmsplugin.ActEdit},
// 		DomainType:  pmsplugin.PrefixDatabase,
// 		DomainId:    strconv.Itoa(databaseInfo.ID),
// 	}); err != nil {
// 		c.JSONE(1, "permission verification failed", err)
// 		return
// 	}
// 	_, err = service.TableCreate(c.Uid(), databaseInfo, param)
// 	if err != nil {
// 		c.JSONE(core.CodeErr, err.Error(), nil)
// 		return
// 	}
// 	event.Event.InquiryCMDB(c.User(), db.OpnTablesCreate, map[string]interface{}{"param": param})
// 	c.JSONOK()
// }

// TableInfo
// @Tags         LOGSTORE
// @Summary		 日志库详情
func TableInfo(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, tid)
	if err != nil {
		c.JSONE(core.CodeErr, "this table does not exist, please verify"+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	instance, err := db2.InstanceInfo(invoker.Db, tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	res := view2.RespTableDetail{
		Did:                     tableInfo.Did,
		Name:                    tableInfo.Name,
		Typ:                     tableInfo.TimeFieldKind,
		Days:                    tableInfo.Days,
		Brokers:                 tableInfo.Brokers,
		Topic:                   tableInfo.Topic,
		Uid:                     tableInfo.Uid,
		TimeField:               tableInfo.TimeField,
		Ctime:                   tableInfo.Ctime,
		Utime:                   tableInfo.Utime,
		Desc:                    tableInfo.Desc,
		ConsumerNum:             tableInfo.ConsumerNum,
		KafkaSkipBrokenMessages: tableInfo.KafkaSkipBrokenMessages,
		Database: view2.RespDatabaseItem{
			Id:             tableInfo.Database.ID,
			Iid:            tableInfo.Database.Iid,
			Name:           tableInfo.Database.Name,
			Uid:            tableInfo.Database.Uid,
			Desc:           tableInfo.Database.Desc,
			DatasourceType: instance.Datasource,
			InstanceName:   instance.Name,
			InstanceDesc:   instance.Desc,
		},
		TraceTableId: tableInfo.TraceTableId,
		V3TableType:  tableInfo.V3TableType,
		RawLogField:  tableInfo.RawLogField,
	}
	if res.TimeField == "" {
		res.TimeField = db2.TimeFieldSecond
	}
	if tableInfo.RawLogField == "" {
		res.IsNotSupAnalysisField = 1
	}
	keys := make([]string, 0)
	data := make(map[string]string, 0)

	if tableInfo.CreateType == constx.TableCreateTypeBufferNullDataPipe {
		tableAttach := db2.BaseTableAttach{}
		tableAttach.Tid = tableInfo.ID
		if err = tableAttach.Info(invoker.Db); err != nil {
			c.JSONE(core.CodeErr, "view sql read failed: "+err.Error(), nil)
			return
		}
		if len(tableAttach.SQLs) == len(tableAttach.Names) {
			keys = append(keys, tableAttach.Names...)
			for k, name := range tableAttach.Names {
				data[name] = tableAttach.SQLs[k]
			}
		}
	} else {
		keys = append(keys, "data_sql", "stream_sql", "view_sql")
		data["data_sql"] = tableInfo.SqlData
		data["stream_sql"] = tableInfo.SqlStream
		data["view_sql"] = tableInfo.SqlView
		if tableInfo.SqlDistributed != "" {
			keys = append(keys, "distribute_sql")
			data["distribute_sql"] = tableInfo.SqlDistributed
		}
	}

	conds := egorm.Conds{}
	conds["tid"] = tableInfo.ID
	viewList, err := db2.ViewList(invoker.Db, conds)
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
}

// TableList
// @Tags         LOGSTORE
// @Summary		 日志库列表
func TableList(c *core.Context) {
	did := cast.ToInt(c.Param("did"))
	if did == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	conds := egorm.Conds{}
	conds["did"] = did
	tableList, err := db2.TableList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	res := make([]view2.RespTableSimple, 0)
	for _, row := range tableList {
		if !service.TableViewIsPermission(c.Uid(), row.Database.Iid, row.ID) {
			continue
		}
		res = append(res, view2.RespTableSimple{
			Id:         row.ID,
			TableName:  row.Name,
			CreateType: row.CreateType,
			Desc:       row.Desc,
		})
	}
	c.JSONOK(res)
}

// TableDelete
// @Tags         LOGSTORE
// @Summary 	 日志库删除
func TableDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	tableInfo, err := db2.TableInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, "delete failed: "+err.Error(), nil)
		return
	}
	if tableInfo.ID == 0 {
		c.JSONE(core.CodeErr, "Unable to delete tables not created by clickvisual.", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActDelete},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	conds := egorm.Conds{}
	conds["tid"] = tableInfo.ID
	alarms, err := db2.AlarmList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, "delete failed 02", err)
		return
	}
	if len(alarms) > 0 {
		c.JSONE(core.CodeErr, "you should delete all alarms before delete table.", nil)
		return
	}
	tx := invoker.Db.Begin()
	err = db2.TableDelete(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed 03", err)
		return
	}
	err = db2.ViewDeleteByTableID(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed 04", err)
		return
	}
	err = db2.IndexDeleteBatch(tx, tableInfo.ID, true)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed 05", err)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, "delete failed 06", err)
		return
	}
	if tableInfo.CreateType != constx.TableCreateTypeExist && tableInfo.CreateType != constx.TableCreateTypeBufferNullDataPipe {
		table := tableInfo.Name
		iid := tableInfo.Database.Iid
		database := tableInfo.Database.Name
		op, errLoad := service.InstanceManager.Load(iid)
		if errLoad != nil {
			c.JSONE(core.CodeErr, errLoad.Error(), errLoad)
			return
		}
		err = op.DeleteTable(database, table, tableInfo.Database.Cluster, tableInfo.ID)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
	}
	if tableInfo.CreateType == constx.TableCreateTypeBufferNullDataPipe {
		op, errLoad := service.InstanceManager.Load(tableInfo.Database.Iid)
		if errLoad != nil {
			c.JSONE(core.CodeErr, errLoad.Error(), errLoad)
			return
		}
		var tableAttach = db2.BaseTableAttach{}
		tableAttach.Tid = tableInfo.ID
		err = tableAttach.Info(invoker.Db)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
		err = op.DeleteTableListByNames(tableAttach.Names, tableInfo.Database.Cluster)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
		err = tableAttach.Delete(invoker.Db)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesDelete, map[string]interface{}{"tableInfo": tableInfo})
	c.JSONOK("delete succeeded. Note that Kafka may be backlogged.")
}

// TableLogs
// @Tags         LOGSTORE
// @Summary	 	 日志搜索
func TableLogs(c *core.Context) {
	st := time.Now()
	var param view2.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter", err)
		return
	}
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db2.TableInfo(invoker.Db, id)
	// default time field
	param.TimeField = db2.TimeFieldSecond
	if tableInfo.CreateType == constx.TableCreateTypeExist && tableInfo.TimeField != "" {
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
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "clickhouse i/o timeout", err)
		return
	}
	firstTry, err := op.Prepare(param, &tableInfo, false)
	if err != nil {
		c.JSONE(core.CodeErr, "param prepare failed", err)
		return
	}
	if firstTry.Query == "" {
		c.JSONE(core.CodeErr, "Query parameter error. Refer to the ClickHouse WHERE syntax. https://clickhouse.com/docs/zh/sql-reference/statements/select/where/", nil)
		return
	}
	res, err := op.GetLogs(firstTry, tableInfo.ID)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	if tableInfo.V3TableType == db2.V3TableTypeJaegerJSON {
		res.IsTrace = 1
	}
	list, err := db2.HiddenFieldList(egorm.Conds{"tid": egorm.Cond{
		Op:  "=",
		Val: tableInfo.ID,
	}})
	if err == nil {
		for i := range list {
			res.HiddenFields = append(res.HiddenFields, list[i].Field)
		}
	}
	if param.IsQueryCount == 1 {
		res.Count, err = op.Count(firstTry)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
	}
	res.Cost = time.Since(st).Milliseconds()
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesLogsQuery, map[string]interface{}{"param": param})
	c.JSONOK(res)
}

// QueryComplete
// @Tags         LOGSTORE
// @Summary      执行SQL请求
func QueryComplete(c *core.Context) {
	var param view2.ReqComplete
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter", err)
		return
	}
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "", err)
		return
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, "", err)
		return
	}
	res, err := op.DoSQL(param.Query)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	res.SortRule, res.IsNeedSort = utils.GenerateFieldOrderRules(param.Query)
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesLogsQuery, map[string]interface{}{"param": param})
	c.JSONOK(res)
}

// TableCharts
// @Tags         LOGSTORE
// @Summary	     日志趋势图
func TableCharts(c *core.Context) {
	var param view2.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: ", err)
		return
	}
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(core.CodeErr, "params error", nil)
		return
	}
	tableInfo, _ := db2.TableInfo(invoker.Db, id)
	param.TimeField = db2.TimeFieldSecond
	if tableInfo.CreateType == constx.TableCreateTypeExist && tableInfo.TimeField != "" {
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
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "checkNormalPermission", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "instanceManagerLoad", err)
		return
	}
	param, err = op.Prepare(param, &tableInfo, false)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	param.GroupByCond, param.Interval = op.CalculateInterval(param.ET-param.ST, clickhouse.TransferGroupTimeField(param.TimeField, tableInfo.TimeFieldType))
	interval := param.Interval

	charts, sql, err := op.Chart(param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), sql)
		return
	}
	res := view2.HighCharts{
		Histograms: make([]*view2.HighChart, 0),
	}
	if len(charts) == 0 {
		c.JSONE(core.CodeOK, sql, res)
		return
	}
	chartMap := make(map[int64]*view2.HighChart)
	// get key info
	var firstFrom int64
	var latestFrom int64
	for i, chart := range charts {
		chartMap[chart.From] = chart
		res.Count += chart.Count
		if i == 0 {
			firstFrom = chart.From
		}
		latestFrom = chart.From
	}
	// fill charts
	st, et := param.ST, param.ET
	if (firstFrom < st-interval || firstFrom > et+interval) || (latestFrom < st-interval || latestFrom > et+interval) {
		c.JSONE(core.CodeErr, "time resolution exception", nil)
		return
	}
	// fill head
	if st+interval < firstFrom {
		// 说明有很多数据需要填充
		fillNum := (firstFrom - st) / interval
		for i := int64(0); i < (fillNum); i++ {
			from := firstFrom - interval*(i+1)
			if from < st {
				from = st
			}
			if _, ok := chartMap[from]; !ok {
				chartMap[from] = &view2.HighChart{
					Count: 0,
					From:  from,
					To:    firstFrom - interval*i,
				}
			}
		}
	}
	// fill tail
	if et-interval > latestFrom {
		// 说明有很多数据需要填充
		fillNum := (et - latestFrom) / interval
		for i := int64(0); i < (fillNum); i++ {
			// to := latestFrom + interval*(i+2)
			from := latestFrom + interval*(i+1)
			// if to > st {
			// 	to = st
			// }
			if _, ok := chartMap[from]; !ok {
				chartMap[from] = &view2.HighChart{
					Count: 0,
					From:  from,
					To:    firstFrom - interval*i,
				}
			}
		}
	}
	for i := firstFrom; i < latestFrom; i += interval {
		if _, ok := chartMap[i]; !ok {
			chartMap[i] = &view2.HighChart{
				Count: 0,
				From:  i,
				To:    i + interval,
			}
		}
	}
	fillCharts := make([]*view2.HighChart, 0)
	for _, chart := range chartMap {
		fillCharts = append(fillCharts, chart)
	}
	sort.Slice(fillCharts, func(i int, j int) bool {
		return fillCharts[i].From < fillCharts[j].From
	})
	l := len(fillCharts)
	if l == 1 {
		fillCharts[0].From = st
		fillCharts[0].To = et
	} else if l > 1 {
		for i := range fillCharts {
			if i == 0 {
				fillCharts[0].From = st
				fillCharts[0].To = fillCharts[1].From
			} else if i == l-1 {
				fillCharts[i].To = et
			} else {
				fillCharts[i].To = fillCharts[i+1].From
			}
		}
	}
	res.Histograms = fillCharts
	c.JSONOK(res)
}

// TableIndexes
// @Tags         LOGSTORE
// @Summary      分析字段列表
func TableIndexes(c *core.Context) {
	var param view2.ReqQuery
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
	tableInfo, _ := db2.TableInfo(invoker.Db, tid)
	param.TimeField = db2.TimeFieldSecond
	if tableInfo.CreateType == constx.TableCreateTypeExist && tableInfo.TimeField != "" {
		param.TimeField = tableInfo.TimeField
	}
	param.Tid = tid
	param.Table = tableInfo.Name
	param.Database = tableInfo.Database.Name
	param.TimeFieldType = tableInfo.TimeFieldType
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db and table are required fields", nil)
		return
	}
	// permission check
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	indexInfo, _ := db2.IndexInfo(invoker.Db, indexId)
	param.Field = indexInfo.GetFieldName()
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	param, err = op.Prepare(param, &tableInfo, false)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter. "+err.Error(), nil)
		return
	}
	list := op.GroupBy(param)
	res := make([]view2.RespIndexItem, 0)
	sum, err := op.Count(param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	var count uint64
	for k, v := range list {
		count += v
		res = append(res, view2.RespIndexItem{
			IndexName: k,
			Count:     v,
			Percent:   kutl.Decimal(float64(v) * 100 / float64(sum)),
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Count > res[j].Count
	})
	c.JSONOK(res)
}

// TableCreateSelfBuilt
// @Tags        LOGSTORE
// @Summary 	接入已有日志库
func TableCreateSelfBuilt(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	var param view2.ReqTableCreateExist
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	err = tableCreateSelfBuilt(c.Uid(), iid, param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTableCreateSelfBuilt, map[string]interface{}{"tableInfo": param})
	c.JSONOK()
}

// TableCreateSelfBuiltBatch
// @Tags    LOGSTORE
// @Summary 批量接入已有日志库
func TableCreateSelfBuiltBatch(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	var params view2.ReqTableCreateExistBatch
	err := c.Bind(&params)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	for _, param := range params.TableList {
		err = tableCreateSelfBuilt(c.Uid(), iid, param)
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTableCreateSelfBuilt, map[string]interface{}{"tableInfo": params})
	c.JSONOK()
}

func tableCreateSelfBuilt(uid, iid int, param view2.ReqTableCreateExist) error {
	// check clickvisual exist
	conds := egorm.Conds{}
	conds["iid"] = iid
	conds["name"] = param.DatabaseName
	existDatabases, err := db2.DatabaseList(invoker.Db, conds)
	if err != nil {
		return err
	}
	for _, existDatabase := range existDatabases {
		condsT := egorm.Conds{}
		condsT["did"] = existDatabase.ID
		existTables, errExistTables := db2.TableList(invoker.Db, condsT)
		if errExistTables != nil {
			return errExistTables
		}
		for _, existTable := range existTables {
			if existTable.Name == param.TableName {
				return errors.New("this table is already exist in clickvisual")
			}
		}
	}
	tx := invoker.Db.Begin()
	databaseInfo, err := db2.DatabaseGetOrCreate(tx, uid, iid, param.DatabaseName, param.Cluster)
	if err != nil {
		tx.Rollback()
		return err
	}
	// no need to operator the database
	tableInfo := db2.BaseTable{
		Did:           databaseInfo.ID,
		Name:          param.TableName,
		Uid:           uid,
		CreateType:    constx.TableCreateTypeExist,
		TimeField:     param.TimeField,
		TimeFieldType: param.TimeFieldType,
		Desc:          param.Desc,
	}
	err = db2.TableCreate(tx, &tableInfo)
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
	columns, err := op.ListColumn(param.DatabaseName, param.TableName, false)
	if err != nil {
		tx.Rollback()
		return err
	}
	for _, col := range columns {
		if col.Type < 0 || col.Type == 3 {
			continue
		}
		err = db2.IndexCreate(tx, &db2.BaseIndex{
			Tid:      tableInfo.ID,
			Field:    col.Name,
			Typ:      col.Type,
			Alias:    "",
			RootName: "",
		})
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	if err = tx.Commit().Error; err != nil {
		return errors.Wrapf(err, "tx commit failed")
	}
	return nil
}

// TableColumnsSelfBuilt
// @Tags         LOGSTORE
// @Summary		 接入已有日志库
func TableColumnsSelfBuilt(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	if iid == 0 {
		c.JSONE(1, "param error: missing iid", nil)
		return
	}
	var param view2.ReqTableCreateExist
	err := c.Bind(&param)
	elog.Debug("TableColumnsSelfBuilt", elog.Any("param", param))
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
		All               []*view2.RespColumn `json:"all"`
		ConformToStandard []*view2.RespColumn `json:"conformToStandard"`
	}
	columnsInfo.ConformToStandard, err = op.ListColumn(param.DatabaseName, param.TableName, true)
	if err != nil {
		c.JSONE(core.CodeErr, "database create failed: "+err.Error(), nil)
		return
	}
	columnsInfo.All, err = op.ListColumn(param.DatabaseName, param.TableName, false)
	if err != nil {
		c.JSONE(core.CodeErr, "database create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK(columnsInfo)
}

// TableUpdate
// @Tags         LOGSTORE
// @Summary 	 日志库配置更新
func TableUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view2.ReqTableUpdate
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	table, err := db2.TableInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "update failed 00"+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(table.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["desc"] = req.Desc
	if err = db2.TableUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed 01"+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db2.OpnTablesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// TableDeps
// @Tags         LOGSTORE
// @Summary 	 日志库依赖分析
func TableDeps(c *core.Context) {
	iid := cast.ToInt(c.Param("iid"))
	dn := strings.TrimSpace(c.Param("dn"))
	tn := strings.TrimSpace(c.Param("tn"))
	if dn == "" || iid == 0 || tn == "" {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	res, err := service.Dependence.Table(iid, dn, tn)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
}
