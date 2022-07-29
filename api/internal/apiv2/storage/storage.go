package storage

import (
	"strconv"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
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
// @Success      200 {object} mapping.StructMapping
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
	databaseInfo, err := db.DatabaseInfo(invoker.Db, 1)
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
	// _, err = service.TableCreate(c.Uid(), databaseInfo, param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTablesCreate, map[string]interface{}{"param": param})
	c.JSONOK()
}
