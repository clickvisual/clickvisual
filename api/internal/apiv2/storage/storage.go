package storage

import (
	"encoding/json"
	"sort"
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/mapping"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// KafkaJsonMapping  godoc
// @Summary	     Kafka JSON field mapping
// @Description  Kafka JSON field mapping
// @Tags         storage
// @Accept       json
// @Produce      json
// @Param        req query view.ReqKafkaJSONMapping true "params"
// @Success      200 {object} view.MappingStruct
// @Router       /api/v2/storage/mapping-json [post]
func KafkaJsonMapping(c *core.Context) {
	var req view.ReqKafkaJSONMapping
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "request parameter error: "+err.Error(), nil)
		return
	}
	res, err := mapping.Handle(req.Data)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

// Create  godoc
// @Summary	     Creating a log library
// @Description  Creating a log library
// @Tags         storage
// @Accept       json
// @Produce      json
// @Param        req query view.ReqStorageCreate true "params"
// @Success      200 {string} ok
// @Router       /api/v2/storage [post]
func Create(c *core.Context) {
	var param view.ReqStorageCreate
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	databaseInfo, err := db.DatabaseInfo(invoker.Db, param.DatabaseId)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(databaseInfo.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
		DomainType:  pmsplugin.PrefixDatabase,
		DomainId:    strconv.Itoa(databaseInfo.ID),
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	param.SourceMapping, err = mapping.Handle(param.Source)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}

	if err = json.Unmarshal([]byte(param.Source), &param.SourceMapping); err != nil {
		if err != nil {
			c.JSONE(core.CodeErr, err.Error(), nil)
			return
		}
	}
	_, err = service.StorageCreate(c.Uid(), databaseInfo, param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTablesCreate, map[string]interface{}{"param": param})
	c.JSONOK()
}

// AnalysisFields  godoc
// @Summary	     Storage analysis field list
// @Description  Storage analysis field list
// @Tags         storage
// @Accept       json
// @Produce      json
// @Param        storage-id path int true "table id"
// @Success      200 {object} view.RespStorageAnalysisFields
// @Router       /api/v2/storage/{storage-id}/analysis-fields [get]
func AnalysisFields(c *core.Context) {
	storageId := cast.ToInt(c.Param("storage-id"))
	if storageId == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res := view.RespStorageAnalysisFields{}
	// Read the index data
	conds := egorm.Conds{}
	conds["tid"] = storageId
	fields, _ := db.IndexList(conds)
	for _, row := range fields {
		res.Keys = append(res.Keys, view.StorageAnalysisField{
			Id:       row.ID,
			Tid:      row.Tid,
			Field:    row.Field,
			RootName: row.RootName,
			Typ:      row.Typ,
			HashTyp:  row.HashTyp,
			Alias:    row.Alias,
			Ctime:    row.Ctime,
			Utime:    row.Utime,
		})
	}
	// keys sort by the first letter
	sort.Slice(res.Keys, func(i, j int) bool {
		return res.Keys[i].Field < res.Keys[j].Field
	})
	c.JSONE(core.CodeOK, "succ", res)
	return
}

// Update  godoc
// @Summary	     Storage update
// @Description  Storage update
// @Tags         storage
// @Accept       json
// @Produce      json
// @Param        storage-id path int true "table id"
// @Param        req query view.ReqStorageUpdate true "params"
// @Success      200 {string} ok
// @Router       /api/v2/storage/{storage-id} [patch]
func Update(c *core.Context) {
	id := cast.ToInt(c.Param("storage-id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var (
		req view.ReqStorageUpdate
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
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(1, "update failed 01: "+err.Error(), nil)
		return
	}
	// check merge tree
	if req.MergeTreeTTL != tableInfo.Days {
		// alert merge tree engine table
		if err = op.AlterMergeTreeTable(&tableInfo, req); err != nil {
			c.JSONE(1, "update failed 02: "+err.Error(), nil)
			return
		}
	}
	var streamSQL string
	// check kafka
	if req.KafkaSkipBrokenMessages != tableInfo.KafkaSkipBrokenMessages ||
		req.KafkaBrokers != tableInfo.Brokers ||
		req.KafkaConsumerNum != tableInfo.ConsumerNum ||
		req.KafkaTopic != tableInfo.Topic {
		// drop & create kafka engine table
		if streamSQL, err = op.ReCreateKafkaTable(&tableInfo, req); err != nil {
			c.JSONE(1, "update failed 03: "+err.Error(), nil)
			return
		}
	}
	// just mysql record update
	ups := make(map[string]interface{}, 0)
	ups["uid"] = c.Uid()
	ups["days"] = req.MergeTreeTTL
	ups["topic"] = req.KafkaTopic
	ups["brokers"] = req.KafkaBrokers
	ups["consumer_num"] = req.KafkaConsumerNum
	ups["desc"] = req.Desc
	ups["kafka_skip_broken_messages"] = req.KafkaSkipBrokenMessages
	if streamSQL != "" {
		ups["sql_stream"] = streamSQL
	}
	if err = db.TableUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed 04: "+err.Error(), nil)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnTablesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}
