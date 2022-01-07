package db

import (
	"errors"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
)

type K8SConfigMap struct {
	ClusterId int    `gorm:"column:cluster_id;type:int(11)" json:"cluster_id"` // 集群ID
	Name      string `gorm:"column:name;type:varchar(128)" json:"name"`
	Namespace string `gorm:"column:namespace;type:varchar(128)" json:"namespace"`

	BaseModel
}

func (m *K8SConfigMap) TableName() string {
	return TableNameK8SConfigMap
}

// K8SConfigMapCreate CRUD
func K8SConfigMapCreate(db *gorm.DB, data *K8SConfigMap) (err error) {
	if err = db.Create(data).Error; err != nil {
		elog.Error("create cluster error", zap.Error(err))
		return
	}
	return nil
}

// K8SConfigMapUpdate ...
func K8SConfigMapUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameK8SConfigMap).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update cluster error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapInfoX Info的扩展方法，根据Cond查询单条记录
func K8SConfigMapInfoX(conds map[string]interface{}) (resp K8SConfigMap, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("K8SConfigMapInfoX infoX error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapListX Info的扩展方法，根据Cond查询单条记录
func K8SConfigMapListX(conds map[string]interface{}) (resp []K8SConfigMap, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("K8SConfigMapListX infoX error", zap.Error(err))
		return
	}
	return
}

func K8SConfigMapLoadOrSave(db *gorm.DB, data *K8SConfigMap) (resp *K8SConfigMap, err error) {
	conds := egorm.Conds{}
	conds["cluster_id"] = data.ClusterId
	conds["name"] = data.Name
	conds["namespace"] = data.Namespace
	respLoad, errLoad := K8SConfigMapInfoX(conds)
	if errLoad != nil {
		if errors.Is(errLoad, gorm.ErrRecordNotFound) {
			// Save
			errSave := K8SConfigMapCreate(db, data)
			if errSave != nil {
				return nil, errSave
			}
			return data, nil
		}
		return nil, errLoad
	}
	return &respLoad, nil
}

func K8SConfigMapInfo(paramId int) (resp K8SConfigMap, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("cluster info error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapDelete 软删除
func K8SConfigMapDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(K8SConfigMap{}).Delete(&K8SConfigMap{}, id).Error; err != nil {
		elog.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapList 获取当前所有未删除的clusters. 主要供 前端用
func K8SConfigMapList(conds egorm.Conds) (resp []*K8SConfigMap, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list clusters error", elog.String("err", err.Error()))
		return
	}
	return
}

// K8SConfigMapListPage 根据分页条件查询list
func K8SConfigMapListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*K8SConfigMap) {
	respList = make([]*K8SConfigMap, 0)
	conds["dtime"] = 0
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...)
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}
