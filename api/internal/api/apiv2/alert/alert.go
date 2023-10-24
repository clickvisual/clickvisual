package alert

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/pkg/errors"
	"github.com/spf13/cast"
	"gopkg.in/yaml.v3"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/alarm/alertcomponent"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
)

// SettingUpdate
// @Tags         ALARM
// @Summary	     告警配置更新
func SettingUpdate(c *core.Context) {
	iid := cast.ToInt(c.Param("instance-id"))
	if iid == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req db2.ReqAlertSettingUpdate
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
	current, err := db2.InstanceInfo(invoker.Db, iid)
	if err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	if current.RuleStoreType != 0 && current.RuleStoreType != req.RuleStoreType {
		// Detect whether there is an alarm under the current condition
		errCheck := service.Alert.IsAllClosed(iid)
		if errCheck != nil {
			c.JSONE(core.CodeErr, errCheck.Error(), errCheck)
			return
		}
	}
	ups := make(map[string]interface{}, 0)
	ups["rule_store_type"] = req.RuleStoreType
	switch req.RuleStoreType {
	case db2.RuleStoreTypeFile:
		ups["file_path"] = req.FilePath
	case db2.RuleStoreTypeK8sConfigMap:
		ups["cluster_id"] = req.ClusterId
		ups["namespace"] = req.Namespace
		ups["configmap"] = req.Configmap
	case db2.RuleStoreTypeK8sOperator:
		var check db2.ConfigPrometheusOperator
		err = yaml.Unmarshal([]byte(req.ConfigPrometheusOperator), &check)
		if err != nil {
			c.JSONE(1, err.Error(), err)
			return
		}
		if !check.IsValid() {
			c.JSONE(1, "prometheus operator rule is not valid", nil)
			return
		}
		ups["cluster_id"] = req.ClusterId
		ups["config_prometheus_operator"] = req.ConfigPrometheusOperator
	}

	if req.RuleStoreType != 0 {
		prometheus := strings.TrimSpace(req.PrometheusTarget)
		if !strings.HasPrefix(prometheus, "http") {
			prometheus = "http://" + prometheus
		}
		p, err := alertcomponent.NewPrometheus(prometheus, req.RuleStoreType)
		if err != nil {
			c.JSONE(1, "prometheus check failed: "+err.Error(), err)
			return
		}
		if err = p.Health(); err != nil && !errors.Is(err, alertcomponent.ErrCheckNotSupported) {
			c.JSONE(1, "prometheus check failed: "+err.Error(), err)
			return
		}
		ups["prometheus_target"] = prometheus
	}
	if err = db2.InstanceUpdate(invoker.Db, iid, ups); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.InquiryCMDB(c.User(), db2.OpnInstancesUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// SettingList
// @Tags         ALARM
// @Summary	     告警配置列表
func SettingList(c *core.Context) {
	res := make([]*db2.RespAlertSettingListItem, 0)
	instanceList, err := db2.InstanceList(egorm.Conds{})
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	checkHistory := make(map[string]db2.RespAlertSettingListItem)
	for _, instance := range instanceList {
		if !service.InstanceViewIsPermission(c.Uid(), instance.ID) {
			continue
		}
		row := db2.RespAlertSettingListItem{
			InstanceId:         instance.ID,
			InstanceName:       instance.Name,
			RuleStoreType:      instance.RuleStoreType,
			PrometheusTarget:   instance.PrometheusTarget,
			IsAlertManagerOK:   1,
			IsPrometheusOK:     1,
			IsMetricsSamplesOk: 1,
		}
		if tmp, ok := checkHistory[instance.PrometheusTarget]; ok {
			row.IsPrometheusOK = tmp.IsPrometheusOK
			row.CheckPrometheusResult = tmp.CheckPrometheusResult
			row.IsAlertManagerOK = tmp.IsAlertManagerOK
			row.CheckAlertManagerResult = tmp.CheckAlertManagerResult
		} else {
			errAlertManager, errProm := func() (error, error) {
				p, errProm := alertcomponent.NewPrometheus(instance.PrometheusTarget, instance.RuleStoreType)
				if errProm != nil {
					return errProm, errProm
				}
				return p.CheckDependents(), p.Health()
			}()
			if errProm != nil {
				row.IsPrometheusOK = 0
				row.CheckPrometheusResult = errProm.Error()
				if errors.Is(errProm, alertcomponent.ErrCheckNotSupported) {
					row.IsPrometheusOK = 3
				}
			}
			if errAlertManager != nil {
				row.IsAlertManagerOK = 0
				row.CheckAlertManagerResult = errAlertManager.Error()
				if errors.Is(errAlertManager, alertcomponent.ErrCheckNotSupported) {
					row.IsAlertManagerOK = 3
				}
			}
			checkHistory[instance.PrometheusTarget] = row
		}
		// prometheus
		if errMetrics := func() error {
			op, errCh := service.InstanceManager.Load(instance.ID)
			if errCh != nil {
				return err
			}
			return op.GetMetricsSamples()
		}(); errMetrics != nil {
			row.IsMetricsSamplesOk = 0
			row.CheckMetricsSamplesResult = errMetrics.Error()
		}
		// check metrics samples
		res = append(res, &row)
	}
	c.JSONOK(res)
}

// SettingInfo
// @Tags         ALARM
// @Summary	     告警配置详情
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
	res, err := db2.InstanceInfo(invoker.Db, iid)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(&db2.RespAlertSettingInfo{
		InstanceId: iid,
		ReqAlertSettingUpdate: db2.ReqAlertSettingUpdate{
			RuleStoreType:            res.RuleStoreType,
			PrometheusTarget:         res.PrometheusTarget,
			FilePath:                 res.FilePath,
			Namespace:                res.K8sNamespace,
			Configmap:                res.K8sConfigmap,
			ClusterId:                res.K8sClusterId,
			ConfigPrometheusOperator: res.ConfigPrometheusOperator,
		},
	})
}

// CreateMetricsSamples
// @Tags         ALARM
// @Summary      Create metrics.samples table
func CreateMetricsSamples(c *core.Context) {
	var err error
	params := db2.ReqCreateMetricsSamples{}
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
	// We need to set version = "v2" can use new feature.
	if err = op.CreateMetricsSamples(params.Cluster); err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	event.Event.UserCMDB(c.User(), db2.OpnDatabasesCreate, map[string]interface{}{"params": params})
	c.JSONOK()
}
