package base

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
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
		Did:       did,
		Name:      param.TableName,
		Typ:       param.Typ,
		Days:      param.Days,
		Brokers:   param.Brokers,
		Topic:     param.Topics,
		SqlData:   d,
		SqlStream: s,
		SqlView:   v,
		Uid:       c.Uid(),
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
			Id:        row.ID,
			TableName: row.Name,
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

	table := tableInfo.Name
	iid := tableInfo.Database.Iid
	database := tableInfo.Database.Name

	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	err = op.TableDrop(database, table, tableInfo.ID)
	if err != nil {
		c.JSONE(core.CodeErr, "delete failed: "+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	err = db.TableDelete(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed: "+err.Error(), nil)
		return
	}
	err = db.ViewDeleteByTableID(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "delete failed: "+err.Error(), nil)
		return
	}
	err = db.IndexDeleteBatch(tx, tableInfo.ID)
	if err != nil {
		tx.Rollback()
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, "delete failed: "+err.Error(), nil)
		return
	}
	c.JSONOK("delete succeeded. Note that Kafka may be backlogged.")
}
