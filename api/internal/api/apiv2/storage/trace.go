package storage

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// GetTraceList  godoc
// @Summary	     trace storage list
// @Description  trace storage list
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Success      200 {object} core.Res{data=[]view.RespTableSimple}
// @Router       /api/v2/storage/traces [get]
func GetTraceList(c *core.Context) {
	conds := egorm.Conds{}
	conds["v3_table_type"] = db2.V3TableTypeJaegerJSON
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

// UpdateTraceInfo  godoc
// @Summary	     iStorage related trace info update
// @Description  iStorage related trace info update
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Param        storage-id path int true "table id"
// @Param        req query view.ReqStorageUpdateTraceInfo true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/storage/{storage-id}/trace [patch]
func UpdateTraceInfo(c *core.Context) {
	id := cast.ToInt(c.Param("storage-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view2.ReqStorageUpdateTraceInfo
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "update failed 01: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	// just mysql record update
	ups := make(map[string]interface{}, 0)
	ups["uid"] = c.Uid()
	ups["trace_table_id"] = req.TraceTableId
	if err = db2.TableUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed 04: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// GetTraceGraph  godoc
// @Summary	     Get trace graph
// @Description  Get trace graph
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Param        storage-id path int true "table id"
// @Param        req query view.ReqStorageGetTraceGraph true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/storage/{storage-id}/trace-graph [get]
func GetTraceGraph(c *core.Context) {
	id := cast.ToInt(c.Param("storage-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view2.ReqStorageGetTraceGraph
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "get trace graph failed: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.Set("st", req.StartTime)
	c.Set("et", req.EndTime)
	c.Set("table", tableInfo.Name)
	c.Set("database", tableInfo.Database.Name)
	res, err := op.GetTraceGraph(c)
	if err != nil {
		c.JSONE(1, "update failed 04", err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesLogsQuery, map[string]interface{}{"req": req})
	c.JSONOK(res)
}

// GetStorageColumns  godoc
// @Summary	     Get storage columns
// @Description  Get storage columns
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Param        storage-id path int true "table id"
// @Success      200 {object} core.Res{data=[]view.RespColumn}
// @Router       /api/v2/storage/{storage-id}/columns [get]
func GetStorageColumns(c *core.Context) {
	id := cast.ToInt(c.Param("storage-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view2.ReqStorageGetTraceGraph
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	tableInfo, err := db2.TableInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	columns, err := op.ListColumn(tableInfo.Database.Name, tableInfo.Name, false)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnTablesLogsQuery, map[string]interface{}{"req": req})
	c.JSONOK(columns)
}
