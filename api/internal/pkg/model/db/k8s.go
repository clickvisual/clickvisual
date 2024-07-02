package db

import (
	"fmt"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/x"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"sigs.k8s.io/yaml"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
)

// status of kubernetes cluster
const (
	_ = iota
	ClusterStatusMaintaining
)

func (m *Cluster) TableName() string {
	return TableNameCluster
}

func (m *K8SConfigMap) TableName() string {
	return TableNameK8SConfigMap
}

type Cluster struct {
	BaseModel

	Name        string `gorm:"column:name;type:varchar(128);NOT NULL;index:uix_cluster_name,unique" json:"clusterName"` // unique name of cluster
	Description string `gorm:"column:description;type:varchar(128)" json:"description"`                                 // brief description of cluster
	Status      int    `gorm:"column:status;type:tinyint(1)" json:"status"`                                             // 0 means Well-Running, others mean not running
	ApiServer   string `gorm:"column:api_server;type:varchar(255);NOT NULL" json:"apiServer"`                           // address of cluster API server
	KubeConfig  string `gorm:"column:kube_config;type:mediumtext;NOT NULL" json:"kubeConfig"`                           // raw content of kube config
}

func (m *Cluster) GetKubeConfig() string {
	// It's a bit silly to judge by prefixes and contained character content
	if strings.Contains(m.KubeConfig, `{"apiVersion":"`) {
		return m.KubeConfig
	}
	aesKey := econf.GetString("app.encryptionKey")
	if aesKey == "" || !(len(aesKey) == 16 || len(aesKey) == 24 || len(aesKey) == 32) {
		return m.KubeConfig
	}
	res, err := x.AESDecrypt(m.KubeConfig, aesKey)
	if err != nil {
		elog.Panic("aes encrypt error", zap.Error(err))
	}
	return res
}

func (m *Cluster) SetKubeConfig(kubeConfig string) string {
	aesKey := econf.GetString("app.encryptionKey")
	if aesKey == "" || !(len(aesKey) == 16 || len(aesKey) == 24 || len(aesKey) == 32) {
		return kubeConfig
	}
	res, err := x.AESEncrypt(kubeConfig, aesKey)
	if err != nil {
		elog.Panic("aes encrypt error", zap.Error(err))
	}
	return res
}

type K8SConfigMap struct {
	BaseModel

	ClusterId int    `gorm:"column:cluster_id;type:int(11);index:uix_cluster_id_name_namespace,unique" json:"clusterId"` // 集群ID
	Name      string `gorm:"column:name;type:varchar(128);index:uix_cluster_id_name_namespace,unique" json:"name"`
	Namespace string `gorm:"column:namespace;type:varchar(64);index:uix_cluster_id_name_namespace,unique" json:"namespace"`
}

// K8SConfigMapCreate CRUD
func K8SConfigMapCreate(db *gorm.DB, data *K8SConfigMap) (err error) {
	if err = db.Create(data).Error; err != nil {
		elog.Error("create cluster error", zap.Error(err))
		return
	}
	return nil
}

// K8SConfigMapInfoX get single item by condition
func K8SConfigMapInfoX(conds map[string]interface{}) (resp K8SConfigMap, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("K8SConfigMapInfoX infoX error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapListX get single item by condition
func K8SConfigMapListX(conds map[string]interface{}) (resp []K8SConfigMap, err error) {
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
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).First(&resp).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		err = errors.Wrapf(err, "k8s config map id: %d", paramId)
		return
	}
	return
}

func (m *Cluster) Key() string {
	return utils.MD5Encode32(fmt.Sprintf("%s-%s-%s", m.Name, m.ApiServer, m.GetKubeConfig()))
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
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		err = errors.Wrapf(err, "cluster id: %d", paramId)
		return
	}
	resp.KubeConfig = json2yaml(resp.GetKubeConfig())
	return
}

func ClusterNormalInfo(paramId int) (resp Cluster, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		err = errors.Wrapf(err, "cluster id: %d", paramId)
		return
	}
	return
}

func ClusterNormalList(conds egorm.Conds) (resp []*Cluster, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		elog.Error("list clusters error", zap.Error(err))
		return
	}
	return
}

func ClusterListHideSensitiveInfo(conds egorm.Conds) (resp []*Cluster, err error) {
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

// ClusterListPage return item list by pagination
func ClusterListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*Cluster) {
	respList = make([]*Cluster, 0)
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
		cluster.KubeConfig = json2yaml(cluster.GetKubeConfig())
	}
	return
}

// ClusterDelete soft delete item by id
func ClusterDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Cluster{}).Unscoped().Delete(&Cluster{}, id).Error; err != nil {
		elog.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

func json2yaml(jsonStr string) string {
	y, _ := yaml.JSONToYAML([]byte(jsonStr))
	return string(y)
}
