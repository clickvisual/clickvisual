package storage

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// GetTraceList  godoc
// @Summary	     trace storage list
// @Description  trace storage list
// @Tags         storage
// @Accept       json
// @Produce      json
// @Success      200 {object} core.Res{data=[]view.RespTableSimple}
// @Router       /api/v2/storage/traces [get]
func GetTraceList(c *core.Context) {
	conds := egorm.Conds{}
	conds["v3_table_type"] = db.V3TableTypeJaegerJSON
	tableList, err := db.TableList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, "read list failed: "+err.Error(), nil)
		return
	}
	res := make([]view.RespTableSimple, 0)
	for _, row := range tableList {
		if !service.TableViewIsPermission(c.Uid(), row.Database.Iid, row.ID) {
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
}

// UpdateTraceInfo  godoc
// @Summary	     iStorage related trace info update
// @Description  iStorage related trace info update
// @Tags         storage
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
		req view.ReqStorageUpdateTraceInfo
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tableInfo, err := db.TableInfo(invoker.Db, id)
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	invoker.Logger.Debug("storage", elog.String("step", "update"), elog.Any("database", tableInfo.Database))
	// just mysql record update
	ups := make(map[string]interface{}, 0)
	ups["uid"] = c.Uid()
	ups["trace_table_id"] = req.TraceTableId
	if err = db.TableUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed 04: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTablesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// GetTraceGraph  godoc
// @Summary	     Get trace graph
// @Description  Get trace graph
// @Tags         storage
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
		req view.ReqStorageGetTraceGraph
		err error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tableInfo, err := db.TableInfo(invoker.Db, id)
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(id),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
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
		c.JSONE(1, "update failed 04: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTablesLogsQuery, map[string]interface{}{"req": req})
	c.JSONOK(res)
}
