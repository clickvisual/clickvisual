package configure

import (
	"regexp"
	"time"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/configure"
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
	resp := make(view.RespListConfig, 0)
	if param.K8SConfigMapId == 0 {
		if param.K8SConfigMapNamespace == "" || param.K8SConfigMapName == "" {
			c.JSONE(1, "参数错误", nil)
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
	if param.K8SConfigMapId == 0 {
		// Gets the configmap ID
		obj := db.K8SConfigMap{
			ClusterId: param.ClusterId,
			Name:      param.K8SConfigMapName,
			Namespace: param.K8SConfigMapNamespace,
		}
		dbConfigMap, errK8SConfigMapLoadOrSave := db.K8SConfigMapLoadOrSave(invoker.Db, &obj)
		if errK8SConfigMapLoadOrSave != nil {
			c.JSONE(1, errK8SConfigMapLoadOrSave.Error(), nil)
			return
		}
		if dbConfigMap == nil {
			c.JSONE(1, "dbConfigMap is nil", nil)
			return
		}
		if dbConfigMap.ID == 0 {
			c.JSONE(1, "dbConfigMap id is 0", nil)
			return
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
	err = db.ConfigurationCreate(invoker.Db, &data)
	if err != nil {
		c.JSONE(1, "创建失败，存在同名配置。", err)
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
	if err = configure.Configure.Update(c, param); err != nil {
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
		c.JSONE(1, "获取配置信息错误.", nil)
		return
	}
	err = configure.Configure.Publish(c, param)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK("发布成功")
}

// History ..
func History(c *core.Context) {
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
	total, list := db.ConfigurationHistoryListPage(egorm.Conds{}, &param)
	c.JSONPage(list, core.Pagination{
		Current:  param.Current,
		PageSize: param.PageSize,
		Total:    total,
	})
}

// Diff ..
func Diff(c *core.Context) {
	param := view.ReqDiffConfig{}
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
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
		c.JSONE(1, "获取配置信息错误.", nil)
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
