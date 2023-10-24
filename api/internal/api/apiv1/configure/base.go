package configure

import (
	"errors"
	"fmt"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube/api"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/configure"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
)

// List 配置文件列表
// @Tags         CONFIGURE
func List(c *core.Context) {
	param := view.ReqListConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	resp := make(view.RespListConfig, 0)
	if param.K8SConfigMapId == 0 {
		if param.K8SConfigMapNamespace == "" || param.K8SConfigMapName == "" || param.ClusterId == 0 {
			c.JSONE(1, "param error", nil)
			return
		}
		condsKCM := egorm.Conds{}
		condsKCM["name"] = param.K8SConfigMapName
		condsKCM["cluster_id"] = param.ClusterId
		condsKCM["namespace"] = param.K8SConfigMapNamespace
		kcm, _ := db2.K8SConfigMapInfoX(condsKCM)
		if kcm.ID == 0 {
			c.JSONOK(resp)
			return
		}
		param.K8SConfigMapId = kcm.ID
	}
	conds := egorm.Conds{}
	conds["k8s_cm_id"] = param.K8SConfigMapId
	list, err := db2.ConfigurationList(conds)
	if err != nil {
		c.JSONE(1, "permission verification failed", err)
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
// @Tags         CONFIGURE
func Detail(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	configuration, err := db2.ConfigurationInfo(id)
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
		user, _ := db2.UserInfo(configuration.LockUid)
		resp.CurrentEditUser = &user
	}
	c.JSONOK(resp)
}

// Create ..
// @Tags         CONFIGURE
func Create(c *core.Context) {
	param := view.ReqCreateConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	_, err = configure.Configure.Create(c, invoker.Db, param)
	if err != nil {
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	event.Event.ConfigCMDB(c.User(), db2.OpnConfigsCreate, map[string]interface{}{"params": param})
	c.JSONOK()
}

// Update ..
// @Tags         CONFIGURE
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
	var configuration db2.Configuration
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
	event.Event.ConfigCMDB(c.User(), db2.OpnConfigsUpdate, map[string]interface{}{"params": param})
	c.JSONOK()
}

// Publish ..
// @Tags         CONFIGURE
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
	var configuration db2.Configuration
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
	event.Event.ConfigCMDB(c.User(), db2.OpnConfigsPublish, map[string]interface{}{"params": param})
	c.JSONOK("succ")
}

// HistoryList ..
// @Tags         CONFIGURE
func HistoryList(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error cluster id", nil)
		return
	}
	param := db2.ReqPage{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	total, list := db2.ConfigurationHistoryListPage(egorm.Conds{"configuration_id": id}, &param)
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
		user, _ := db2.UserInfo(item.Uid)
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
// @Tags         CONFIGURE
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
	resp, err := db2.ConfigurationHistoryInfoX(conds)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Diff ..
// @Tags         CONFIGURE
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
// @Tags         CONFIGURE
func Delete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error param id", nil)
		return
	}
	configInfo, _ := db2.ConfigurationInfo(id)
	err := configure.Configure.Delete(c, id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	event.Event.ConfigCMDB(c.User(), db2.OpnConfigsDelete, map[string]interface{}{"configInfo": configInfo})
	c.JSONOK()
}

// @Tags         CONFIGURE
func Lock(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id < 1 {
		c.JSONE(1, "error param id", nil)
		return
	}
	var configuration db2.Configuration
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

// @Tags         CONFIGURE
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
// @Tags         CONFIGURE
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
		c.JSONE(core.CodeErr, "cluster data acquisition failed", err)
		return
	}
	var obj runtime.Object
	obj, err = client.KubeClient.Get(api.ResourceNameConfigMap, param.K8SConfigMapNamespace, param.K8SConfigMapName)
	if err != nil {
		elog.Error("configmaps", elog.String("err", err.Error()), elog.String("namespace", param.K8SConfigMapNamespace), elog.String("configmap", param.K8SConfigMapName))
		c.JSONE(core.CodeErr, "client.KubeClient.List", err)
		return
	}
	tx := invoker.Db.Begin()
	cm := *(obj.(*corev1.ConfigMap))
	elog.Debug("sync", elog.String("step", "cm"), elog.Any("cm", cm))

	k8sCMObject := db2.K8SConfigMap{
		ClusterId: param.ClusterId,
		Name:      param.K8SConfigMapName,
		Namespace: param.K8SConfigMapNamespace,
	}
	k8sCM, err := db2.K8SConfigMapLoadOrSave(tx, &k8sCMObject)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "cluster data acquisition failed", err)
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
		var configuration db2.Configuration
		configuration, err = db2.ConfigurationInfoX(conds)
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
	event.Event.ConfigCMDB(c.User(), db2.OpnConfigsSync, map[string]interface{}{"param": param})
	c.JSONOK(res)
}
