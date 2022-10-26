package alert

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
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

// SettingUpdate  godoc
// @Summary	     Alert Basic Configuration Modification
// @Description  Alert Basic Configuration Modification
// @Tags         alert
// @Accept       json
// @Produce      json
// @Param        instance-id path int true "instance id"
// @Param        req query db.ReqAlertSettingUpdate true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/alert/settings/{instance-id} [patch]
func SettingUpdate(c *core.Context) {
	iid := cast.ToInt(c.Param("instance-id"))
	if iid == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req db.ReqAlertSettingUpdate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}

	ups := make(map[string]interface{}, 0)
	ups["rule_store_type"] = req.RuleStoreType
	if req.RuleStoreType == db.RuleStoreTypeK8s {
		ups["cluster_id"] = req.ClusterId
		ups["namespace"] = req.Namespace
		ups["configmap"] = req.Configmap
	}
	if req.RuleStoreType == db.RuleStoreTypeFile {
		ups["file_path"] = req.FilePath
	}
	if req.RuleStoreType != 0 {
		prometheus := strings.TrimSpace(req.PrometheusTarget)
		if !strings.HasPrefix(prometheus, "http") {
			prometheus = "http://" + prometheus
		}
		if err := service.Alarm.PrometheusReload(prometheus); err != nil {
			c.JSONE(1, "prometheus reload failed: "+err.Error(), err)
			return
		}
		ups["prometheus_target"] = prometheus
	}
	if err := db.InstanceUpdate(invoker.Db, iid, ups); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db.OpnInstancesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// SettingList   godoc
// @Summary	     Instance alarm configuration list
// @Description  Instance alarm configuration list
// @Tags         alert
// @Accept       json
// @Produce      json
// @Success      200 {object} []db.RespAlertSettingListItem
// @Router       /api/v2/alert/settings [get]
func SettingList(c *core.Context) {
	res := make([]*db.RespAlertSettingListItem, 0)
	instanceList, err := db.InstanceList(egorm.Conds{})
	for _, instance := range instanceList {
		if service.InstanceViewIsPermission(c.Uid(), instance.ID) {
			res = append(res, &db.RespAlertSettingListItem{
				InstanceId:       instance.ID,
				InstanceName:     instance.Name,
				RuleStoreType:    instance.RuleStoreType,
				PrometheusTarget: instance.PrometheusTarget,
			})
		}
	}
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

// SettingInfo   godoc
// @Summary	     Advanced configuration information in the instance
// @Description  Advanced configuration information in the instance
// @Tags         alert
// @Accept       json
// @Produce      json
// @Param        instance-id path int true "instance id"
// @Success      200 {object} db.RespAlertSettingInfo
// @Router       /api/v2/alert/settings/{instance-id} [get]
func SettingInfo(c *core.Context) {
	iid := cast.ToInt(c.Param("instance-id"))
	if iid == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	if !service.InstanceViewPmsWithSubResource(c.Uid(), iid, pmsplugin.Alarm) {
		c.JSONE(1, "authentication failed", nil)
		return
	}
	res, err := db.InstanceInfo(invoker.Db, iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(&db.RespAlertSettingInfo{
		InstanceId: iid,
		ReqAlertSettingUpdate: db.ReqAlertSettingUpdate{
			RuleStoreType:    res.RuleStoreType,
			PrometheusTarget: res.PrometheusTarget,
			FilePath:         res.FilePath,
			Namespace:        res.Namespace,
			Configmap:        res.Configmap,
			ClusterId:        res.ClusterId,
		},
	})
	return
}
