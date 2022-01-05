package configure

import (
	"regexp"
	"time"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/component/core"
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
	conds := egorm.Conds{}
	if param.K8SConfigMapId != 0 {
		conds["k8s_cm_id"] = param.K8SConfigMapId
	} else if param.K8SConfigMapName != "" && param.K8SConfigMapNamespace != "" {
		conds["k8s_cm_name"] = param.K8SConfigMapName
		conds["k8s_cm_namespace"] = param.K8SConfigMapNamespace
	} else {
		c.JSONE(1, "参数错误", err)
		return
	}
	list, err := db.ConfigurationList(conds)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(list)
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
		user, _ := db.UserInfo(int(configuration.LockUid))
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
	fileNameRegex := regexp.MustCompile("^[a-zA-Z][a-zA-Z0-9_-]{1,32}$")
	if !fileNameRegex.MatchString(param.Name) {
		c.JSONE(1, "无效的文件名", nil)
		return
	}
	data := db.Configuration{
		K8SCmId:        0,
		K8SCmName:      "",
		K8SCmNamespace: "",
		Name:           param.Name,
		Content:        "",
		Format:         string(param.Format),
		Version:        "",
		Uid:            c.Uid(),
		PublishTime:    time.Now().Unix(),
		LockUid:        0,
		LockAt:         time.Time{},
		BaseModel:      db.BaseModel{},
	}
	err = db.ConfigurationCreate(invoker.Db, &data)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}

// Update ..
func Update(c *core.Context) {
	param := view.ReqUpdateConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	var configuration db.Configuration
	err = invoker.Db.Where("id = ?", param.ID).First(&configuration).Error
	if err != nil || configuration.ID == 0 {
		c.JSONE(1, "获取配置信息错误.", nil)
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["message"] = param.Message
	ups["content"] = param.Content
	err = db.ConfigurationUpdate(invoker.Db, param.ID, ups)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	c.JSONOK()
}

// Publish ..
func Publish(c *core.Context) {
	param := view.ReqPublishConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	var configuration db.Configuration
	err = invoker.Db.Where("id = ?", param.ID).First(&configuration).Error
	if err != nil || configuration.ID == 0 {
		c.JSONE(1, "获取配置信息错误.", nil)
		return
	}
	// err = service.Config.Publish(c, param)
	// if err != nil {
	// 	c.JSONE(1, err.Error(), err)
	// 	return
	// }

	c.JSONOK("发布成功")
}

//
// // BatchPublishAppLatestConfigs...
// func BatchPublishAppLatestConfigs(c *core.Context) {
// 	aid := cast.ToInt(c.Param("aid"))
// 	if aid <= 0 {
// 		c.JSONE(1, "invalid aid", nil)
// 		return
// 	}
// 	req := view.ReqBatchPublishAppLatestConfigs{}
// 	if err := c.Bind(&req); err != nil {
// 		c.JSONE(1, "请求参数错误:"+err.Error(), nil)
// 		return
// 	}
// 	if len(req.ConfigIds) <= 0 {
// 		c.JSONE(1, "no configIds, do nothing.", nil)
// 		return
// 	}
// 	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
// 		UserId:      c.AdminUid(),
// 		ObjectType:  pmsplugin.PrefixApp,
// 		ObjectIdx:   strconv.Itoa(aid),
// 		SubResource: pmsplugin.AppConfig,
// 		Acts:        []string{pmsplugin.ActExec},
// 		DomainType:  pmsplugin.PrefixEnv,
// 		DomainId:    strconv.Itoa(req.EnvId),
// 	}); err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
//
// 	req.Aid = aid
// 	if err := service.ConfigGo.BatchPublishAppLatestConfigs(req, c); err != nil {
// 		c.JSONE(1, "配置发布失败. "+err.Error(), nil)
// 		return
// 	}
// 	c.JSONOK("最新版本配置发布成功")
// }
//
// // History ..
// func History(c *core.Context) {
// 	param := view.ReqHistoryConfig{}
// 	err := c.Bind(&param)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
//
// 	history, err := service.ConfigGo.History(param, c.AdminUid())
// 	if err != nil {
// 		if err == errorconst.ParamConfigNotExists.Error() {
// 			c.JSONE(1, "当前配置不存在，无法更新", err)
// 			return
// 		}
//
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
// 	c.JSONOK(history)
// }
//
// // Diff ..
// func Diff(c *core.Context) {
// 	param := view.ReqDiffConfig{}
// 	err := c.Bind(&param)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
// 	resp, err := service.ConfigGo.Diff(param.ID, param.HistoryID)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
// 	c.JSONOK(resp)
// }
//
// // Delete ..
// func Delete(c *core.Context) {
// 	param := view.ReqDeleteConfig{}
// 	err := c.Bind(&param)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
// 	var configuration db.Configuration
// 	err = invoker.Db.Where("id = ?", param.ID).First(&configuration).Error
// 	if err != nil || configuration.ID == 0 {
// 		c.JSONE(1, "获取配置信息错误.", nil)
// 		return
// 	}
// 	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
// 		UserId:      c.AdminUid(),
// 		ObjectType:  pmsplugin.PrefixApp,
// 		ObjectIdx:   strconv.Itoa(int(configuration.AID)),
// 		SubResource: pmsplugin.AppConfig,
// 		Acts:        []string{pmsplugin.ActDelete},
// 		DomainType:  pmsplugin.PrefixEnv,
// 		DomainId:    strconv.Itoa(configuration.EnvId),
// 	}); err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
//
// 	err = service.ConfigGo.Delete(c, param.ID)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
// 	c.JSONOK()
// }
//
// func Lock(c *core.Context) {
// 	param := view.ReqLockConfig{}
// 	err := c.Bind(&param)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
// 	var configuration db.Configuration
// 	err = invoker.Db.Where("id = ?", param.ConfigID).First(&configuration).Error
// 	if err != nil || configuration.ID == 0 {
// 		c.JSONE(1, "获取配置信息错误.", nil)
// 		return
// 	}
// 	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
// 		UserId:      c.AdminUid(),
// 		ObjectType:  pmsplugin.PrefixApp,
// 		ObjectIdx:   strconv.Itoa(int(configuration.AID)),
// 		SubResource: pmsplugin.AppConfig,
// 		Acts:        []string{pmsplugin.ActEdit},
// 		DomainType:  pmsplugin.PrefixEnv,
// 		DomainId:    strconv.Itoa(configuration.EnvId),
// 	}); err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
//
// 	err = service.ConfigGo.TryLock(c.AdminUid(), param.ConfigID)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
//
// 	c.JSONOK()
// }
//
// func Unlock(c *core.Context) {
// 	param := view.ReqLockConfig{}
// 	err := c.Bind(&param)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
//
// 	err = service.ConfigGo.Unlock(c.AdminUid(), param.ConfigID)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
//
// 	c.JSONOK()
// }
//
// func GetConfigFileVersionDiff(c *core.Context) {
// 	configId := cast.ToInt(c.Param("configId"))
// 	if configId == 0 {
// 		c.JSONE(1, "invalid configuration id. ", nil)
// 		return
// 	}
//
// 	md5version := strings.TrimSpace(c.Param("md5version"))
// 	if md5version == "" {
// 		c.JSONE(1, "md5 version cannot be empty. ", nil)
// 		return
// 	}
// 	var (
// 		tgtConfigHistory db.ConfigurationHistory
// 	)
// 	err := invoker.Db.Preload("Configuration").Preload("User").
// 		Where("configuration_id = ? AND version = ?", configId, md5version).First(&tgtConfigHistory).Error
// 	if err != nil {
// 		c.JSONE(1, "get target configuration version history failed. "+err.Error(), nil)
// 		return
// 	}
// 	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
// 		UserId:      c.AdminUid(),
// 		ObjectType:  pmsplugin.PrefixApp,
// 		ObjectIdx:   strconv.Itoa(tgtConfigHistory.Configuration.AID),
// 		SubResource: pmsplugin.AppConfig,
// 		Acts:        []string{pmsplugin.ActView},
// 		DomainType:  pmsplugin.PrefixEnv,
// 		DomainId:    strconv.Itoa(tgtConfigHistory.Configuration.EnvId),
// 	}); err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
// 	resp, err := service.ConfigGo.GetConfigFileDiffBtwLastApply(&tgtConfigHistory)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
// 	c.JSONOK(resp)
// }
//
// func GetAppLatestConfigsDiff(c *core.Context) {
// 	aid := cast.ToInt(c.Param("aid"))
// 	if aid <= 0 {
// 		c.JSONE(1, "invalid aid", nil)
// 		return
// 	}
// 	req := view.ReqAppLatestConfigsDiff{}
// 	if err := c.Bind(&req); err != nil {
// 		c.JSONE(1, "获取app最新配置文件diff的请求参数错误:"+err.Error(), nil)
// 		return
// 	}
// 	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
// 		UserId:      c.AdminUid(),
// 		ObjectType:  pmsplugin.PrefixApp,
// 		ObjectIdx:   strconv.Itoa(aid),
// 		SubResource: pmsplugin.AppConfig,
// 		Acts:        []string{pmsplugin.ActView},
// 		DomainType:  pmsplugin.PrefixEnv,
// 		DomainId:    strconv.Itoa(req.EnvId),
// 	}); err != nil {
// 		c.JSONE(1, err.Error(), nil)
// 		return
// 	}
// 	req.Aid = aid
// 	resp, err := service.ConfigGo.GetAppLatestConfigsDiff(req)
// 	if err != nil {
// 		c.JSONE(1, err.Error(), err)
// 		return
// 	}
// 	c.JSONOK(resp)
// }
