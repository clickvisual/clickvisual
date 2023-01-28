package base

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/source"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// InstanceCreate
// @Tags         SYSTEM
// @Summary 	 ClickHouse 创建
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
	if _, err := service.InstanceCreate(req); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnInstancesCreate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// InstanceUpdate
// @Tags         SYSTEM
// @Summary 	 ClickHouse 更新
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
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	req.PrometheusTarget = strings.TrimSpace(req.PrometheusTarget)
	if req.PrometheusTarget != "" {
		if err := service.Alert.PrometheusReload(req.PrometheusTarget); err != nil {
			c.JSONE(1, "create DB failed: "+err.Error(), nil)
			return
		}
	}
	objBef, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	isCluster, _, isReplica, clusters, err := source.Instantiate(&source.Source{
		DSN: req.Dsn,
		Typ: db.Datasource2IntORM[req.Datasource],
	}).ClusterInfo()
	if err != nil {
		return
	}
	// status 0 has replica 1 no replica
	replicaStatus := 1
	if isReplica == 1 {
		replicaStatus = 0
	}
	ups := make(map[string]interface{}, 0)
	if objBef.Dsn != req.Dsn || objBef.Mode != isCluster || objBef.ReplicaStatus != isReplica {
		// dns changed
		service.InstanceManager.Delete(objBef.DsKey())
		objUpdate := db.BaseInstance{
			Datasource:    req.Datasource,
			Name:          req.Name,
			Dsn:           req.Dsn,
			Mode:          isCluster,
			Clusters:      clusters,
			ReplicaStatus: replicaStatus,
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
	ups["mode"] = isCluster
	ups["datasource"] = req.Datasource
	ups["replica_status"] = replicaStatus
	ups["desc"] = req.Desc
	ups["clusters"] = db.Strings(clusters)
	if err = db.InstanceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnInstancesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// InstanceList
// @Tags         SYSTEM
// @Summary 	 ClickHouse 列表
func InstanceList(c *core.Context) {
	res := make([]*db.BaseInstance, 0)
	tmp, err := db.InstanceList(egorm.Conds{})
	for _, row := range tmp {
		if service.InstanceViewIsPermission(c.Uid(), row.ID) {
			row.Dsn = "*"
			res = append(res, row)
		}
	}
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

// InstanceInfo
// @Tags         SYSTEM
// @Summary 	 ClickHouse 详情
func InstanceInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if !service.InstanceViewIsPermission(c.Uid(), id) {
		c.JSONE(1, "authentication failed", nil)
		return
	}
	res, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

// InstanceDelete
// @Tags         SYSTEM
// @Summary 	 ClickHouse 删除
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
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["iid"] = id
	databases, _ := db.DatabaseList(invoker.Db, conds)
	if len(databases) != 0 {
		c.JSONE(1, "please delete the database first", nil)
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

// InstanceTest
// @Tags         SYSTEM
// @Summary 	 ClickHouse/Databend DSN 测试
func InstanceTest(c *core.Context) {
	var req view.ReqTestInstance
	var err error
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	if err = permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	switch req.Datasource {
	case db.DatasourceClickHouse:
		_, err = service.ClickHouseLink(req.Dsn)
	case db.DatasourceDatabend:
		_, err = service.DatabendLink(req.Dsn)
	default:
		c.JSONE(1, "data source type error", nil)
		return
	}
	if err != nil {
		c.JSONE(1, "connection failure: "+err.Error(), err)
		return
	}
	c.JSONOK()
}
