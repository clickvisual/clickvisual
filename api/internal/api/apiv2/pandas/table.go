package pandas

import (
	"strconv"
	"strings"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// TableCreateSQL  godoc
// @Summary	     table create sql
// @Description  table create sql
// @Tags         BIGDATA
// @Accept       json
// @Produce      json
// @Param        instance-id path int true "instance id"
// @Param        database path string true "database name"
// @Param        table path string true "table name"
// @Success      200 {object} core.Res{data=string}
// @Router       /api/v2/pandas/instances/{instance-id}/databases/{database}/tables/{table}/create-sql [get]
func TableCreateSQL(c *core.Context) {
	id := cast.ToInt(c.Param("instance-id"))
	database := strings.TrimSpace(c.Param("database"))
	table := strings.TrimSpace(c.Param("table"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Pandas,
		Acts:        []string{pmsplugin.ActView},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(id)
	if err != nil {
		c.JSONE(core.CodeErr, "", err)
		return
	}
	res, err := op.GetCreateSQL(database, table)
	if err != nil {
		c.JSONE(core.CodeErr, "", err)
		return
	}
	c.JSONOK(res)
}
