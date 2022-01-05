package configure

import (
	"encoding/json"
	"fmt"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/resource"
	"github.com/shimohq/mogo/api/pkg/component/core"
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

func (s *configure) Update(c *core.Context, param view.ReqUpdateConfig) (err error) {
	var configuration db.Configuration
	err = invoker.Db.Where("id = ?", param.ID).First(&configuration).Error
	if err != nil || configuration.ID == 0 {
		return errors.New("获取配置信息错误.")
	}
	err = CheckSyntax(view.ConfigFormat(configuration.Format), param.Content)
	if err != nil {
		return
	}
	// Calculate the current version number
	version := utils.MD5(param.Content)
	if utils.MD5(configuration.Content) == version {
		return errors.New("保存失败，本次无更新.")
	}
	history := db.ConfigurationHistory{
		ConfigurationId: uint(configuration.ID),
		ChangeLog:       param.Message,
		Content:         param.Content,
		Version:         version,
		Uid:             c.Uid(),
	}
	tx := invoker.Db.Begin()
	{
		err = tx.Where("id = ?", param.ID).First(&configuration).Error
		if err != nil {
			tx.Rollback()
			return
		}
		if configuration.LockUid != 0 && configuration.LockUid != c.Uid() {
			tx.Rollback()
			return fmt.Errorf("当前有其他人正在编辑，更新失败")
		}
		err = tx.Where("version=? AND configuration_id=?", version, param.ID).Delete(&db.ConfigurationHistory{}).Error
		if err != nil {
			tx.Rollback()
			return err
		}
		// 存历史版本
		err = tx.Save(&history).Error
		if err != nil {
			tx.Rollback()
			return err
		}
		ups := make(map[string]interface{}, 0)
		ups["version"] = version
		ups["content"] = param.Content
		err = db.ConfigurationUpdate(tx, param.ID, ups)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	err = tx.Commit().Error
	if err != nil {
		tx.Rollback()
		return err
	}
	return nil
}

// Publish ..
func (s *configure) Publish(c *core.Context, param view.ReqPublishConfig) (err error) {
	if c.Uid() == 0 {
		return fmt.Errorf("无法获取授权信息")
	}
	// find configure version
	conds := egorm.Conds{}
	conds["configuration_id"] = param.ID
	conds["version"] = param.Version
	var history db.ConfigurationHistory
	history, err = db.ConfigurationHistoryInfoX(conds)
	elog.Debug("Publish", elog.Any("history", history))
	if err != nil {
		return err
	}
	configureObj := history.Configuration
	k8sConfigmap := history.Configuration.K8SConfigMap
	configData := make(map[string]string)
	filename := configureObj.FileName()
	configData[filename] = history.Content
	configData[s.configMetadataKey(filename)] = s.marshallMetadata(view.ConfigMetadata{
		Version:     history.Version,
		ChangeLog:   history.ChangeLog,
		PublishedBy: int(c.Uid()),
	})
	lock := NewConfigMapLock(k8sConfigmap.Namespace, k8sConfigmap.Name, history.Configuration.K8SCmId)
	if !lock.Lock() {
		return fmt.Errorf("有其他用户或系统正在更新ConfigMap，更新失败")
	}
	defer lock.Unlock()

	client, err := kube.ClusterManager.GetClusterManager(k8sConfigmap.ClusterId)
	if err != nil {
		return fmt.Errorf("集群数据获取失败: " + err.Error())
	}
	err = resource.ConfigmapCreateOrUpdate(client, k8sConfigmap.Namespace, k8sConfigmap.Name, configData)
	if err != nil {
		return errors.Wrap(err, "ConfigMap 更新失败")
	}
	return
}

// Delete ..
func (s *configure) Delete(c *core.Context, id int) (err error) {
	var config db.Configuration
	if c.Uid() == 0 {
		return fmt.Errorf("无法获取授权信息")
	}
	tx := invoker.Db.Begin()
	{
		config, err = db.ConfigurationInfo(id)
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "")
		}
		err = db.ConfigurationDelete(tx, id)
		if err != nil {
			tx.Rollback()
			return errors.Wrap(err, "删除配置记录失败")
		}
		kcm, errKcm := db.K8SConfigMapInfo(id)
		if errKcm != nil {
			tx.Rollback()
			return errors.Wrap(err, errKcm.Error())
		}
		configLock := NewConfigMapLock(kcm.Namespace, kcm.Name, kcm.ID)
		if !configLock.Lock() {
			tx.Rollback()
			return errors.Errorf("存在其他用户在操作配置，删除失败")
		}
		err = resource.ConfigmapDelete(kcm.ClusterId, kcm.Namespace, kcm.Name, s.configMetadataKey(config.FileName()))
		if err != nil {
			configLock.Unlock()
			tx.Rollback()
			return errors.Wrap(err, "ConfigMap更新失败")
		}
		configLock.Unlock()
	}
	err = tx.Commit().Error
	if err != nil {
		return errors.Wrap(err, "删除失败，事物提交失败")
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
