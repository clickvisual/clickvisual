package storage

import (
	"strconv"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// Create  godoc
// @Summary	     Creating a no format restrictions log library
// @Description  Creating a no format restrictions log library
// @Tags         LOGSTORE
// @Accept       json
// @Produce      json
// @Param        req query view.ReqStorageCreateV3 true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v3/storage [post]
func Create(c *core.Context) {
	var param view.ReqStorageCreateV3
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), err)
		return
	}
	databaseInfo, err := db.DatabaseInfo(invoker.Db, param.DatabaseId)
	if err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), err)
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
		c.JSONE(1, "CheckNormalPermission", err)
		return
	}
	_, err = service.StorageCreateV3(c.Uid(), databaseInfo, param)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnTablesCreate, map[string]interface{}{"param": param})
	c.JSONOK()
}
