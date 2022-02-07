package configure

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/resource"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/constx"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
	"github.com/shimohq/mogo/api/pkg/utils"
)

var Configure *configure

type configure struct{}

// InitConfigure ...
func InitConfigure() *configure {
	return &configure{}
}

func (s *configure) configMetadataKey(filename string) string {
	return fmt.Sprintf("__metadata.%s", filename)
}

func (s *configure) marshallMetadata(metadata view.ConfigMetadata) string {
	metadataBytes, _ := json.Marshal(metadata)
	return string(metadataBytes)
}

func (s *configure) Create(c *core.Context, tx *gorm.DB, param view.ReqCreateConfig) (configuration db.Configuration, err error) {
	if strings.Contains(param.Name, "__metadata") {
		return configuration, constx.ErrSkipConfigureName
	}
	fileNameRegex := regexp.MustCompile("^[a-zA-Z][a-zA-Z0-9_-]{1,32}$")
	if !fileNameRegex.MatchString(param.Name) {
		return configuration, errors.New("Invalid file name: " + param.Name)
	}
	if param.K8SConfigMapId == 0 {
		// Gets the configmap ID
		obj := db.K8SConfigMap{
			ClusterId: param.ClusterId,
			Name:      param.K8SConfigMapName,
			Namespace: param.K8SConfigMapNamespace,
		}
		dbConfigMap, errK8SConfigMapLoadOrSave := db.K8SConfigMapLoadOrSave(invoker.Db, &obj)
		if errK8SConfigMapLoadOrSave != nil {
			return configuration, errK8SConfigMapLoadOrSave
		}
		if dbConfigMap == nil {
			return configuration, errors.New("dbConfigMap is nil")
		}
		if dbConfigMap.ID == 0 {
			return configuration, errors.New("dbConfigMap is 0")
		}
		param.K8SConfigMapId = dbConfigMap.ID
	}
	data := db.Configuration{
		K8SCmId:     param.K8SConfigMapId,
		Name:        param.Name,
		Content:     "",
		Format:      string(param.Format),
		Version:     "",
		Uid:         c.Uid(),
		PublishTime: time.Now().Unix(),
	}
	conds := egorm.Conds{}
	conds["name"] = param.Name
	conds["format"] = string(param.Format)
	conds["k8s_cm_id"] = param.K8SConfigMapId
	hc, err := db.ConfigurationInfoX(conds)
	if err != nil {
		return configuration, err
	}
	if hc.ID != 0 {
		// do update
		ups := make(map[string]interface{}, 0)
		ups["dtime"] = 0
		ups["lock_uid"] = 0
		ups["lock_at"] = 0
		if err = db.ConfigurationUpdate(tx, hc.ID, ups); err != nil {
			return configuration, err
		}
		hc.Dtime = 0
		return hc, err
	}
	err = db.ConfigurationCreate(tx, &data)
	return data, err
}

func (s *configure) Update(c *core.Context, tx *gorm.DB, param view.ReqUpdateConfig, configuration db.Configuration) (err error) {
	err = CheckSyntax(view.ConfigFormat(configuration.Format), param.Content)
	if err != nil {
		return
	}
	// Calculate the current version number
	if utils.MD5(configuration.Content) == utils.MD5(param.Content) {
		return constx.ErrConfigurationIsNoDifference
	}
	version := uuid.New().String()
	history := db.ConfigurationHistory{
		ConfigurationId: configuration.ID,
		ChangeLog:       param.Message,
		Content:         param.Content,
		Version:         version,
		Uid:             c.Uid(),
	}
	{
		err = tx.Where("id = ?", param.ID).First(&configuration).Error
		if err != nil {
			return
		}
		if configuration.LockUid != 0 && configuration.LockUid != c.Uid() {
			return fmt.Errorf("someone else is editing, update failed")
		}
		// Save the historical version
		err = tx.Save(&history).Error
		if err != nil {
			return err
		}
		ups := make(map[string]interface{}, 0)
		ups["version"] = version
		ups["content"] = param.Content
		err = db.ConfigurationUpdate(tx, param.ID, ups)
		if err != nil {
			return err
		}
	}
	return nil
}

// Publish ..
func (s *configure) Publish(c *core.Context, param view.ReqPublishConfig) (err error) {
	if c.Uid() == 0 {
		return fmt.Errorf("unable to get authorization information")
	}
	// find configure version
	conds := egorm.Conds{}
	conds["configuration_id"] = param.ID
	conds["version"] = param.Version
	var history db.ConfigurationHistory
	history, err = db.ConfigurationHistoryInfoX(conds)
	if err != nil {
		return err
	}
	configureObj, _ := db.ConfigurationInfo(history.ConfigurationId)
	k8sConfigmap, _ := db.K8SConfigMapInfo(configureObj.K8SCmId)

	elog.Debug("Publish", elog.Any("history", history))

	configData := make(map[string]string)
	filename := configureObj.FileName()
	configData[filename] = history.Content
	configData[s.configMetadataKey(filename)] = s.marshallMetadata(view.ConfigMetadata{
		Version:     history.Version,
		ChangeLog:   history.ChangeLog,
		PublishedBy: c.Uid(),
	})
	lock := NewConfigMapLock(k8sConfigmap.Namespace, k8sConfigmap.Name, configureObj.K8SCmId)
	if !lock.Lock() {
		return fmt.Errorf("configMap is being updated by another user or system. update failed")
	}
	defer lock.Unlock()

	client, err := kube.ClusterManager.GetClusterManager(k8sConfigmap.ClusterId)
	if err != nil {
		return fmt.Errorf("cluster data acquisition failed: " + err.Error())
	}
	err = resource.ConfigmapCreateOrUpdate(client, k8sConfigmap.Namespace, k8sConfigmap.Name, configData)
	if err != nil {
		return errors.Wrap(err, "configMap update failed")
	}
	return
}

// Delete ..
func (s *configure) Delete(c *core.Context, id int) (err error) {
	var config db.Configuration
	if c.Uid() == 0 {
		return fmt.Errorf("unable to get authorization information")
	}

	tx := invoker.Db.Begin()
	{
		config, err = db.ConfigurationInfo(id)
		if err != nil {
			tx.Rollback()
			return err
		}
		k8sCM, errK8sCM := db.K8SConfigMapInfo(config.K8SCmId)
		if errK8sCM != nil {
			tx.Rollback()
			return errK8sCM
		}
		// read remote configmap data
		var upstreamValue string
		upstreamValue, err = resource.ConfigmapInfo(k8sCM.ClusterId, k8sCM.Namespace, k8sCM.Name, config.FileName())
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "read configmap data failed")
		}
		if utils.MD5(upstreamValue) != utils.MD5(config.Content) {
			elog.Debug("delete", elog.Any("upstreamValue", upstreamValue), elog.Any("config.Content", config.Content))
			tx.Rollback()
			return errors.New("The deleted configuration is inconsistent with the effective configuration. The effective configuration cannot be deleted.")
		}
		err = db.ConfigurationDelete(tx, id)
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "configuration deletion failed")
		}
		kcm, errKcm := db.K8SConfigMapInfo(config.K8SCmId)
		if errKcm != nil {
			tx.Rollback()
			return errKcm
		}
		configLock := NewConfigMapLock(kcm.Namespace, kcm.Name, kcm.ID)
		if !configLock.Lock() {
			tx.Rollback()
			return errors.Errorf("failed to delete because there are other users operating the configuration")
		}
		err = resource.ConfigmapDelete(kcm.ClusterId, kcm.Namespace, kcm.Name, config.FileName(), s.configMetadataKey(config.FileName()))
		if err != nil {
			configLock.Unlock()
			tx.Rollback()
			return errors.Wrap(err, "configMap update failed")
		}
		configLock.Unlock()
	}
	err = tx.Commit().Error
	if err != nil {
		return errors.Wrap(err, "failed to delete, transaction submission failed")
	}
	return
}

// Diff ..
func (s *configure) Diff(configID, historyID int) (resp view.RespDiffConfig, err error) {
	modifiedConfig := db.ConfigurationHistory{}
	err = invoker.Db.Preload("Configuration").Preload("User").
		Where("id = ?", historyID).First(&modifiedConfig).Error
	if err != nil {
		return
	}

	originConfig := db.ConfigurationHistory{}
	err = invoker.Db.Preload("Configuration").Preload("User").
		Where("id < ? and configuration_id = ?", historyID, configID).Order("id desc").First(&originConfig).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			resp.Origin = nil
			err = nil
		} else {
			return
		}
	} else {
		resp.Origin = &view.RespDetailConfig{
			ID:          originConfig.ID,
			ConfigmapId: originConfig.Configuration.K8SCmId,
			Name:        originConfig.Configuration.Name,
			Content:     originConfig.Content,
			Format:      originConfig.Configuration.Format,
			Ctime:       originConfig.Ctime,
			Utime:       originConfig.Configuration.Utime,
			PublishTime: originConfig.Configuration.PublishTime,
		}
	}
	resp.Modified = view.RespDetailConfig{
		ID:          modifiedConfig.ID,
		ConfigmapId: modifiedConfig.Configuration.K8SCmId,
		Name:        modifiedConfig.Configuration.Name,
		Content:     modifiedConfig.Content,
		Format:      modifiedConfig.Configuration.Format,
		Ctime:       modifiedConfig.Ctime,
		Utime:       modifiedConfig.Configuration.Utime,
		PublishTime: modifiedConfig.Configuration.PublishTime,
	}
	return
}
