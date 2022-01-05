package service

type config struct{}

// NewConfig ...
func NewConfig() *config {
	return &config{}
}

//
// // Publish ..
// func (s *config) Publish(c *core.Context, param view.ReqPublishConfig) (err error) {
// 	if c.Uid() == 0 {
// 		return fmt.Errorf("无法获取授权信息")
// 	}
// 	// find config version
// 	conds := egorm.Conds{}
// 	conds["configuration_id"] = param.ID
// 	conds["version"] = param.Version
// 	history, err := db.ConfigurationHistoryInfoX(conds)
// 	var configVersion db.ConfigurationHistory
// 	err = invoker.Db.Preload(db.TableNameConfiguration).Preload("mogo_configuration.App").
// 		Where("configuration_id = ? and version = ?", param.ID, param.Version).First(&configVersion).Error
// 	if err != nil {
// 		return errors.Wrap(err, "查询配置版本失败")
// 	}
//
// 	config := configVersion.Configuration
// 	// check the existence of env
// 	envWithTargetZone, err := environment.Environment.GetEnhancedEnv(configVersion.Configuration.EnvId, config.ZoneId)
// 	if err != nil {
// 		return fmt.Errorf("配置所对应的环境的zone不存在[envId=%d, zoneId=%d]", config.EnvId, config.ZoneId)
// 	}
// 	// fill resources
// 	configContent, err := s.configResource.FillConfigResource(configVersion.Content, envWithTargetZone.EnterpriseId,
// 		config.EnvId, config.ZoneId, false)
// 	if err != nil {
// 		return fmt.Errorf("填充配置资源值失败. %w", err)
// 	}
//
// 	configData := make(map[string]string)
// 	filename := config.FileName()
// 	configData[filename] = configContent
// 	configData[s.configMetadataKey(filename)] = s.marshallMetadata(configMetadata{
// 		Version:     configVersion.Version,
// 		ChangeLog:   configVersion.ChangeLog,
// 		PublishedBy: c.AdminUid(),
// 	})
// 	appName := config.App.AppName
//
// 	lock := NewConfigMapLock(s, config.EnvId, config.ZoneId, appName)
// 	locked := lock.Lock()
// 	if !locked {
// 		return fmt.Errorf("有其他用户或系统正在更新ConfigMap，更新失败")
// 	}
// 	defer lock.Unlock()
//
// 	//err = clusterClients.UpdateConfigMap(appName, configData)
// 	err = kube.EnvManager.UpdateConfigMapInEnvZone(envWithTargetZone, appName, configData)
// 	if err != nil {
// 		return errors.Wrap(err, "ConfigMap 更新失败")
// 	}
//
// 	s.recordPublishEvent(config, configVersion, config.App, c)
//
// 	return
// }
