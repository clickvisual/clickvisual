package base

import (
	"strconv"
	"strings"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/internal/service/event"
	"github.com/shimohq/mogo/api/internal/service/inquiry"
	"github.com/shimohq/mogo/api/internal/service/permission"
	"github.com/shimohq/mogo/api/internal/service/permission/pmsplugin"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func InstanceCreate(c *core.Context) {
	var req view.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["datasource"] = req.Datasource
	conds["name"] = req.Name
	checks, err := db.InstanceList(conds)
	if err != nil {
		c.JSONE(1, "create DB failed: "+err.Error(), nil)
		return
	}
	if len(checks) > 0 {
		c.JSONE(1, "data source configuration with duplicate name", nil)
		return
	}
	if req.Mode == inquiry.ModeCluster && len(req.Clusters) == 0 {
		c.JSONE(1, "you need to fill in the cluster information", nil)
		return
	}
	obj := db.Instance{
		Datasource:       req.Datasource,
		Name:             req.Name,
		Dsn:              strings.TrimSpace(req.Dsn),
		RuleStoreType:    req.RuleStoreType,
		FilePath:         req.FilePath,
		ClusterId:        req.ClusterId,
		Namespace:        req.Namespace,
		Configmap:        req.Configmap,
		PrometheusTarget: req.PrometheusTarget,

		Mode:     req.Mode,
		Clusters: req.Clusters,
	}
	invoker.Logger.Debug("instanceCreate", elog.Any("obj", obj))
	if req.PrometheusTarget != "" {
		if err = service.Alarm.PrometheusReload(req.PrometheusTarget); err != nil {
			c.JSONE(1, "create DB failed: "+err.Error(), nil)
			return
		}
	}
	tx := invoker.Db.Begin()
	if err = db.InstanceCreate(tx, &obj); err != nil {
		tx.Rollback()
		c.JSONE(1, "create DB failed: "+err.Error(), nil)
		return
	}
	if err = service.InstanceManager.Add(&obj); err != nil {
		tx.Rollback()
		c.JSONE(1, "DNS configuration exception, database connection failure 01: "+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(1, "DNS configuration exception, database connection failure 02: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnInstancesCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
}

func InstanceUpdate(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if req.PrometheusTarget != "" {
		if err := service.Alarm.PrometheusReload(req.PrometheusTarget); err != nil {
			c.JSONE(1, "create DB failed: "+err.Error(), nil)
			return
		}
	}
	objBef, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	if objBef.Dsn != req.Dsn {
		// dns changed
		service.InstanceManager.Delete(objBef.DsKey())
		objUpdate := db.Instance{
			Datasource: req.Datasource,
			Name:       req.Name,
			Dsn:        req.Dsn,
			Mode:       req.Mode,
			Clusters:   req.Clusters,
		}
		objUpdate.ID = id
		if err = service.InstanceManager.Add(&objUpdate); err != nil {
			_ = service.InstanceManager.Add(&objBef)
			c.JSONE(1, "DNS configuration exception, database connection failure 03: "+err.Error(), nil)
			return
		}
		ups["dsn"] = req.Dsn
	}

	ups["name"] = req.Name
	ups["mode"] = req.Mode
	ups["datasource"] = req.Datasource
	ups["rule_store_type"] = req.RuleStoreType

	if req.FilePath != "" {
		ups["file_path"] = req.FilePath
	}
	if req.ClusterId != 0 {
		ups["cluster_id"] = req.ClusterId
	}
	if req.Namespace != "" {
		ups["namespace"] = req.Namespace
	}
	if req.Configmap != "" {
		ups["configmap"] = req.Configmap
	}
	ups["clusters"] = req.Clusters
	ups["prometheus_target"] = req.PrometheusTarget
	if err = db.InstanceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnInstancesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

func InstanceList(c *core.Context) {
	res := make([]*db.Instance, 0)
	tmp, err := db.InstanceList(egorm.Conds{})
	for _, row := range tmp {
		if !service.InstanceManager.ReadPermissionInstance(c.Uid(), row.ID) {
			continue
		}
		res = append(res, row)
	}
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func InstanceDelete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.InstanceBase,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	obj, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	if err = db.InstanceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	service.InstanceManager.Delete(obj.DsKey())
	event.Event.InquiryCMDB(c.User(), db.OpnInstancesDelete, map[string]interface{}{"instanceInfo": obj})
	c.JSONOK()
}
