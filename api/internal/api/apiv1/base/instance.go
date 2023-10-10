package base

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
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

// InstanceCreate
// @Tags         SYSTEM
// @Summary 	 ClickHouse 创建
func InstanceCreate(c *core.Context) {
	var req view2.ReqCreateInstance
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
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesCreate, map[string]interface{}{"req": req})
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
	var req view2.ReqCreateInstance
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
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
	objBef, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	if objBef.Dsn != req.Dsn {
		// dns changed
		service.InstanceManager.Delete(objBef.DsKey())
		objUpdate := db2.BaseInstance{
			Datasource: req.Datasource,
			Name:       req.Name,
			Dsn:        req.Dsn,
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
	ups["datasource"] = req.Datasource
	ups["desc"] = req.Desc
	if err = db2.InstanceUpdate(invoker.Db, id, ups); err != nil {
		c.JSONE(1, "update failed: "+err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// InstanceList
// @Tags         SYSTEM
// @Summary 	 ClickHouse 列表
func InstanceList(c *core.Context) {
	res := make([]view2.RespInstance, 0)
	tmp, err := db2.InstanceList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	var errMsg string
	for _, row := range tmp {
		if service.InstanceViewIsPermission(c.Uid(), row.ID) {
			op, err := service.InstanceManager.Load(row.ID)
			if err != nil {
				elog.Error("InstanceList", l.S("step", "InstanceManager"), l.E(err))
				errMsg += err.Error() + ";"
				continue
			}
			clusterInfo, err := op.ClusterInfo()
			if err != nil {
				elog.Error("InstanceList", l.S("step", "ClusterInfo"), l.E(err))
				errMsg += err.Error() + ";"
				continue
			}
			cis := make([]string, 0)
			cs := make([]string, 0)
			isCluster := 0
			for _, ci := range clusterInfo {
				cis = append(cis, ci.Info())
				cs = append(cs, ci.Name)
				if ci.MaxShardNum > 1 || ci.MaxReplicaNum > 1 {
					isCluster = 1
				}
			}
			res = append(res, view2.RespInstance{
				Id:          row.ID,
				Name:        row.Name,
				Clusters:    cs,
				ClusterInfo: cis,
				Mode:        isCluster,
				Desc:        row.Desc,
			})
		}
	}
	if errMsg != "" {
		c.JSONE(0, errMsg, res)
		return
	}
	c.JSONOK(res)
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
	res, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
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
	if err := permission.Manager.CheckNormalPermission(view2.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(id),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActDelete},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	obj, err := db2.InstanceInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(1, "failed to delete, corresponding record does not exist in database: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["iid"] = id
	databases, _ := db2.DatabaseList(invoker.Db, conds)
	if len(databases) != 0 {
		c.JSONE(1, "please delete the database first", nil)
		return
	}
	if err = db2.InstanceDelete(invoker.Db, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	service.InstanceManager.Delete(obj.DsKey())
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesDelete, map[string]interface{}{"instanceInfo": obj})
	c.JSONOK()
}

// InstanceTest
// @Tags         SYSTEM
// @Summary 	 ClickHouse/Databend DSN 测试
func InstanceTest(c *core.Context) {
	var req view2.ReqTestInstance
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
	case db2.DatasourceClickHouse:
		_, err = service.ClickHouseLink(req.Dsn)
	case db2.DatasourceDatabend:
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
