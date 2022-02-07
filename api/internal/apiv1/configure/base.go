package configure

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/configure"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/api"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/constx"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

// List 配置文件列表
func List(c *core.Context) {
	param := view.ReqListConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	resp := make(view.RespListConfig, 0)
	if param.K8SConfigMapId == 0 {
		if param.K8SConfigMapNamespace == "" || param.K8SConfigMapName == "" {
			c.JSONE(1, "param error", nil)
			return
		}
		condsKCM := egorm.Conds{}
		condsKCM["name"] = param.K8SConfigMapName
		condsKCM["namespace"] = param.K8SConfigMapNamespace
		kcm, _ := db.K8SConfigMapInfoX(condsKCM)
		if kcm.ID == 0 {
			c.JSONOK(resp)
			return
		}
		param.K8SConfigMapId = kcm.ID
	}
	conds := egorm.Conds{}
	conds["k8s_cm_id"] = param.K8SConfigMapId
	list, err := db.ConfigurationList(conds)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	for _, item := range list {
		resp = append(resp, view.RespListConfigItem{
			ID:          item.ID,
			Name:        item.Name,
			Format:      item.Format,
			K8SCmId:     item.K8SCmId,
			Ctime:       item.Ctime,
			Utime:       item.Utime,
			PublishTime: item.PublishTime,
		})
	}
	c.JSONOK(resp)
}

// Detail ..
func Detail(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	configuration, err := db.ConfigurationInfo(id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	resp := view.RespDetailConfig{
		ID:          configuration.ID,
		Name:        configuration.Name,
		Content:     configuration.Content,
		Format:      configuration.Format,
		Ctime:       configuration.Ctime,
		Utime:       configuration.Utime,
		PublishTime: configuration.PublishTime,
	}
	if configuration.LockUid != 0 {
		user, _ := db.UserInfo(configuration.LockUid)
		resp.CurrentEditUser = &user
	}
	c.JSONOK(resp)
}

// Create ..
func Create(c *core.Context) {
	param := view.ReqCreateConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	_, err = configure.Configure.Create(c, invoker.Db, param)
	if err != nil {
		c.JSONE(1, "create failed, configuration with same name exist: ", err)
		return
	}
	c.JSONOK()
}

// Update ..
func Update(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	param := view.ReqUpdateConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	param.ID = id
	var configuration db.Configuration
	err = invoker.Db.Where("id = ?", param.ID).First(&configuration).Error
	if err != nil || configuration.ID == 0 {
		c.JSONE(1, "can not get the configuration information", err)
		return
	}
	tx := invoker.Db.Begin()
	if err = configure.Configure.Update(c, tx, param, configuration); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	err = tx.Commit().Error
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}

// Publish ..
func Publish(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	param := view.ReqPublishConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	param.ID = id
	var configuration db.Configuration
	err = invoker.Db.Where("id = ?", param.ID).First(&configuration).Error
	if err != nil || configuration.ID == 0 {
		c.JSONE(1, "failed to get configuration information", nil)
		return
	}
	err = configure.Configure.Publish(c, param)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK("succ")
}

// HistoryList ..
func HistoryList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	param := db.ReqPage{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	total, list := db.ConfigurationHistoryListPage(egorm.Conds{"configuration_id": id}, &param)
	for k, _ := range list {
		if list[k].Uid != 0 {

		}
	}
	resp := make([]view.RespHistoryConfigItem, 0)
	for _, item := range list {
		configItem := view.RespHistoryConfigItem{
			ID:              item.ID,
			UID:             item.Uid,
			ConfigurationID: item.ConfigurationId,
			Version:         item.Version,
			Ctime:           item.Ctime,
			ChangeLog:       item.ChangeLog,
		}
		configItem.UID = item.Uid
		user, _ := db.UserInfo(item.Uid)
		configItem.UserName = user.Nickname
		resp = append(resp, configItem)
	}

	c.JSONPage(resp, core.Pagination{
		Current:  param.Current,
		PageSize: param.PageSize,
		Total:    total,
	})
}

// HistoryInfo ..
func HistoryInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	version := strings.TrimSpace(c.Param("version"))
	if id < 1 || version == "" {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	conds := egorm.Conds{}
	conds["configuration_id"] = id
	conds["version"] = version
	resp, err := db.ConfigurationHistoryInfoX(conds)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Diff ..
func Diff(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error param id", nil)
		return
	}
	param := view.ReqDiffConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	param.ID = id
	resp, err := configure.Configure.Diff(param.ID, param.HistoryID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Delete ..
func Delete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error param id", nil)
		return
	}
	err := configure.Configure.Delete(c, id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK()
}

func Lock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error param id", nil)
		return
	}
	var configuration db.Configuration
	err := invoker.Db.Where("id = ?", id).First(&configuration).Error
	if err != nil || configuration.ID == 0 {
		c.JSONE(1, "failed to get configuration information", nil)
		return
	}
	err = configure.Configure.TryLock(c.Uid(), id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}

func Unlock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error param id", nil)
		return
	}
	err := configure.Configure.Unlock(int(c.Uid()), id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}

// Sync Synchronize the configmap configuration
// if id is 0 means all configurations need to be synchronized
// not support update operator
func Sync(c *core.Context) {
	param := view.ReqSyncConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	id := cast.ToInt(c.Param("id"))
	if id != 0 {
		// TODO Configuration update based on ID
		c.JSONE(1, "only support id 0 and sync all configuration", nil)
		return
	}
	// Read all configurations under the configmap in the cluster
	var client *kube.ClusterClient
	client, err = kube.ClusterManager.GetClusterManager(param.ClusterId)
	if err != nil {
		c.JSONE(core.CodeErr, "cluster data acquisition failed: "+err.Error(), nil)
		return
	}
	var obj runtime.Object
	obj, err = client.KubeClient.Get(api.ResourceNameConfigMap, param.K8SConfigMapNamespace, param.K8SConfigMapName)
	if err != nil {
		elog.Error("configmaps", elog.String("err", err.Error()))
		c.JSONE(core.CodeErr, "client.KubeClient.List error: "+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	cm := *(obj.(*corev1.ConfigMap))
	elog.Debug("sync", elog.String("step", "cm"), elog.Any("cm", cm))

	k8sCMObject := db.K8SConfigMap{
		ClusterId: param.ClusterId,
		Name:      param.K8SConfigMapName,
		Namespace: param.K8SConfigMapNamespace,
	}
	k8sCM, err := db.K8SConfigMapLoadOrSave(tx, &k8sCMObject)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "cluster data acquisition failed: "+err.Error(), nil)
		return
	}
	if k8sCM.ID == 0 {
		c.JSONE(core.CodeErr, "k8sCM id is 0", nil)
		return
	}
	var res string
	param.K8SConfigMapId = k8sCM.ID
	for key, val := range cm.Data {
		nameArr := strings.Split(key, ".")
		if len(nameArr) < 2 {
			elog.Warn("sync", elog.String("name", key), elog.String("err", "nameArr size error"))
			continue
		}
		format := nameArr[len(nameArr)-1]
		name := strings.TrimSuffix(key, "."+format)

		// if exist
		conds := egorm.Conds{}
		conds["name"] = name
		conds["format"] = format
		conds["k8s_cm_id"] = param.K8SConfigMapId
		var configuration db.Configuration
		configuration, err = db.ConfigurationInfoX(conds)
		if err != nil {
			continue
		}
		if configuration.ID == 0 {
			configuration, err = configure.Configure.Create(c, tx, view.ReqCreateConfig{
				Name:                  name,
				Format:                view.ConfigFormat(format),
				K8SConfigMapId:        param.K8SConfigMapId,
				K8SConfigMapName:      param.K8SConfigMapName,
				K8SConfigMapNamespace: param.K8SConfigMapNamespace,
				ClusterId:             param.ClusterId,
			})
			if err != nil {
				if errors.Is(err, constx.ErrSkipConfigureName) {
					continue
				}
				tx.Rollback()
				c.JSONE(core.CodeErr, "configure.Configure.Create error:"+err.Error(), nil)
				return
			}
		}
		elog.Debug("sync", elog.String("step", "Update"), elog.Any("configuration", configuration))
		err = configure.Configure.Update(c, tx, view.ReqUpdateConfig{ID: configuration.ID, Message: "sync from cluster", Content: val}, configuration)
		if err != nil {
			if errors.Is(err, constx.ErrConfigurationIsNoDifference) {
				continue
			}
			tx.Rollback()
			c.JSONE(1, err.Error(), err)
			return
		}
		res += fmt.Sprintf("update file：%s.%s ,", name, format)
	}
	err = tx.Commit().Error
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK(res)
}
