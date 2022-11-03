package alert

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/alert/alertcomponent"
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
	// Obtain the current alarm basic configuration
	current, err := db.InstanceInfo(invoker.Db, iid)
	if err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if current.RuleStoreType != 0 && current.RuleStoreType != req.RuleStoreType {
		// Detect whether there is an alarm under the current condition
		errCheck := service.Alarm.IsAllClosed(iid)
		if errCheck != nil {
			c.JSONE(core.CodeErr, errCheck.Error(), errCheck)
			return
		}
	}
	ups := make(map[string]interface{}, 0)
	ups["rule_store_type"] = req.RuleStoreType
	if req.RuleStoreType == db.RuleStoreTypeK8sConfigMap {
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
		p, err := alertcomponent.NewPrometheus(prometheus)
		if err != nil {
			c.JSONE(1, "prometheus check failed: "+err.Error(), err)
			return
		}
		if err = p.Health(); err != nil {
			c.JSONE(1, "prometheus check failed: "+err.Error(), err)
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
		if !service.InstanceViewIsPermission(c.Uid(), instance.ID) {
			continue
		}
		row := db.RespAlertSettingListItem{
			InstanceId:         instance.ID,
			InstanceName:       instance.Name,
			RuleStoreType:      instance.RuleStoreType,
			PrometheusTarget:   instance.PrometheusTarget,
			IsAlertManagerOK:   1,
			IsPrometheusOK:     1,
			IsMetricsSamplesOk: 1,
		}
		// prometheus
		errProm, errAlertManager := func() (error, error) {
			p, errProm := alertcomponent.NewPrometheus(instance.PrometheusTarget)
			if errProm != nil {
				return errProm, errProm
			}
			return p.Health(), p.CheckDependents()
		}()
		if errProm != nil {
			row.IsPrometheusOK = 0
			row.CheckPrometheusResult = errProm.Error()
		}
		if errAlertManager != nil {
			row.IsAlertManagerOK = 0
			row.CheckAlertManagerResult = errAlertManager.Error()
		}
		if err = func() error {
			op, errCh := service.InstanceManager.Load(instance.ID)
			if errCh != nil {
				return err
			}
			return op.GetMetricsSamples()
		}(); err != nil {
			row.IsMetricsSamplesOk = 0
			row.CheckMetricsSamplesResult = err.Error()
		}
		// check metrics samples
		res = append(res, &row)
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

// CreateMetricsSamples  godoc
// @Summary      Create metrics samples table
// @Description  Store advanced metric data
// @Tags         alert
// @Produce      json
// @Param        req body db.ReqCreateMetricsSamples true "params"
// @Success      200 {object} core.Res{}
// @Router       /api/v2/alert/metrics-samples [post]
func CreateMetricsSamples(c *core.Context) {
	var err error
	params := db.ReqCreateMetricsSamples{}
	err = c.Bind(&params)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(params.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(params.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	if err = op.CreateMetricsSamples(params.Cluster); err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	event.Event.UserCMDB(c.User(), db.OpnDatabasesCreate, map[string]interface{}{"params": params})
	c.JSONOK()
	return
}
