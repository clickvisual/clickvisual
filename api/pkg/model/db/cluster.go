package db

import (
	"fmt"

	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"sigs.k8s.io/yaml"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/utils"
)

// k8s集群状态相关常量:
const (
	ClusterStatusNormal = iota
	ClusterStatusMaintaining
	ClusterStatusNotAvailable
)

type Cluster struct {
	BaseModel

	Name        string `gorm:"column:name;type:varchar(255);NOT NULL" json:"clusterName"`     // k8s集群英文唯一标识名
	Description string `gorm:"column:description;type:varchar(128)" json:"description"`       // 对k8s集群的简要描述
	Status      int    `gorm:"column:status;type:tinyint(1)" json:"status"`                   // 集群状态,0:正常, 非0:不正常
	ApiServer   string `gorm:"column:api_server;type:varchar(255);NOT NULL" json:"apiServer"` // k8s集群的ApiServer地址
	KubeConfig  string `gorm:"column:kube_config;type:mediumtext;NOT NULL" json:"kubeConfig"` // admin权限的kubeconfig文件
}

func (m *Cluster) TableName() string {
	return TableNameCluster
}

func (m *Cluster) Key() string {
	return utils.MD5(fmt.Sprintf("%s-%s-%s", m.Name, m.ApiServer, m.KubeConfig))
}

// ClusterCreate CRUD
func ClusterCreate(db *gorm.DB, data *Cluster) (err error) {
	if err = db.Create(data).Error; err != nil {
		elog.Error("create cluster error", zap.Error(err))
		return
	}
	return
}

// ClusterUpdate ...
func ClusterUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameCluster).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("update cluster error", zap.Error(err))
		return
	}
	return
}

func ClusterInfo(paramId int) (resp Cluster, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("cluster info error", zap.Error(err))
		return
	}
	resp.KubeConfig = json2yaml(resp.KubeConfig)
	return
}

func ClusterNormalInfo(paramId int) (resp Cluster, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("cluster info error", zap.Error(err))
		return
	}
	return
}

func ClusterUpdateX(db *gorm.DB, conds egorm.Conds, ups map[string]interface{}) (err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameCluster).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("updateX cluster error", zap.Error(err))
		return
	}
	return
}

// ClusterInfoX Info的扩展方法，根据Cond查询单条记录
func ClusterInfoX(db *gorm.DB, conds map[string]interface{}) (resp Cluster, err error) {

	conds["dtime"] = 0

	sql, binds := egorm.BuildQuery(conds)

	if err = db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("cluster infoX error", zap.Error(err))
		return
	}
	resp.KubeConfig = json2yaml(resp.KubeConfig)
	return
}

// ClusterList 获取当前所有未删除的clusters. 主要供 前端用
func ClusterList(conds egorm.Conds) (resp []*Cluster, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)

	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list clusters error", zap.Error(err))
		return
	}
	for _, cluster := range resp {
		cluster.KubeConfig = json2yaml(cluster.KubeConfig)
	}
	return
}

func ClusterNormalList(conds egorm.Conds) (resp []*Cluster, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)

	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list clusters error", zap.Error(err))
		return
	}
	return
}

// GetAllNormalClusters 获取当前所有未删除且状态正常的clusters; 主要供后端调用.
func GetAllNormalClusters() (result []*Cluster, err error) {
	conds := egorm.Conds{
		"dtime":  0,
		"status": ClusterStatusNormal,
	}
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&result).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("get all normal clusters failed", zap.Error(err))
		return
	}
	return

}

func ClusterListHideSensitiveInfo(conds egorm.Conds) (resp []*Cluster, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list clusters error", zap.Error(err))
		return
	}
	for _, cluster := range resp {
		cluster.KubeConfig = ""
	}
	return
}

// ClusterListPage 根据分页条件查询list
func ClusterListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*Cluster) {
	respList = make([]*Cluster, 0)

	conds["dtime"] = 0

	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)

	db := invoker.Db.Table(TableNameCluster).Where(sql, binds...)
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	for _, cluster := range respList {
		cluster.KubeConfig = json2yaml(cluster.KubeConfig)
	}
	return
}

// ClusterDelete 软删除
func ClusterDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Cluster{}).Delete(&Cluster{}, id).Error; err != nil {
		elog.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

func json2yaml(jsonStr string) string {
	y, _ := yaml.JSONToYAML([]byte(jsonStr))
	return string(y)
}
