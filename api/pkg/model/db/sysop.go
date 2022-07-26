package db

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
	"sigs.k8s.io/yaml"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

// status of kubernetes cluster
const (
	ClusterStatusNormal = iota
	ClusterStatusMaintaining
	ClusterStatusNotAvailable
)

func (m *Cluster) TableName() string {
	return TableNameCluster
}

func (m *K8SConfigMap) TableName() string {
	return TableNameK8SConfigMap
}

func (User) TableName() string {
	return TableNameUser
}

type Cluster struct {
	BaseModel

	Name        string `gorm:"column:name;type:varchar(255);NOT NULL;index:uix_cluster_name,unique" json:"clusterName"` // unique name of cluster
	Description string `gorm:"column:description;type:varchar(128)" json:"description"`                                 // brief description of cluster
	Status      int    `gorm:"column:status;type:tinyint(1)" json:"status"`                                             // 0 means Well-Running, others mean not running
	ApiServer   string `gorm:"column:api_server;type:varchar(255);NOT NULL" json:"apiServer"`                           // address of cluster API server
	KubeConfig  string `gorm:"column:kube_config;type:mediumtext;NOT NULL" json:"kubeConfig"`                           // raw content of kube config
}

type K8SConfigMap struct {
	BaseModel

	ClusterId int    `gorm:"column:cluster_id;type:int(11);index:uix_cluster_id_name_namespace,unique" json:"clusterId"` // 集群ID
	Name      string `gorm:"column:name;type:varchar(128);index:uix_cluster_id_name_namespace,unique" json:"name"`
	Namespace string `gorm:"column:namespace;type:varchar(64);index:uix_cluster_id_name_namespace,unique" json:"namespace"`
}

type User struct {
	BaseModel
	Uid              int        `gorm:"-" json:"uid"`
	OaId             int64      `gorm:"column:oa_id;type:bigint(20);NOT NULL" json:"oaId"`                           // oa_id
	Username         string     `gorm:"column:username;type:varchar(256);NOT NULL" json:"username"`                  // 用户名
	Nickname         string     `gorm:"column:nickname;type:varchar(256);NOT NULL" json:"nickname"`                  // 昵称
	Secret           string     `gorm:"column:secret;type:varchar(256);NOT NULL" json:"secret"`                      // 实例名称
	Email            string     `gorm:"column:email;type:varchar(64);NOT NULL" json:"email"`                         // email
	Avatar           string     `gorm:"column:avatar;type:varchar(256);NOT NULL" json:"avatar"`                      // avatar
	Hash             string     `gorm:"column:hash;type:varchar(256);NOT NULL" json:"hash"`                          // hash
	WebUrl           string     `gorm:"column:web_url;type:varchar(256);NOT NULL" json:"webUrl"`                     // webUrl
	Oauth            string     `gorm:"column:oauth;type:varchar(256);NOT NULL" json:"oauth"`                        // oauth
	State            string     `gorm:"column:state;type:varchar(256);NOT NULL" json:"state"`                        // state
	OauthId          string     `gorm:"column:oauth_id;type:varchar(256);NOT NULL" json:"oauthId"`                   // oauthId
	Password         string     `gorm:"column:password;type:varchar(256);NOT NULL" json:"password"`                  // password
	CurrentAuthority string     `gorm:"column:current_authority;type:varchar(256);NOT NULL" json:"currentAuthority"` // currentAuthority
	Access           string     `gorm:"column:access;type:varchar(256);NOT NULL" json:"access"`                      // access
	OauthToken       OAuthToken `gorm:"column:oauth_token;type:text" json:"-"`                                       // oauth_token
}

// K8SConfigMapCreate CRUD
func K8SConfigMapCreate(db *gorm.DB, data *K8SConfigMap) (err error) {
	if err = db.Create(data).Error; err != nil {
		invoker.Logger.Error("create cluster error", zap.Error(err))
		return
	}
	return nil
}

// K8SConfigMapUpdate ...
func K8SConfigMapUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameK8SConfigMap).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update cluster error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapInfoX get single item by condition
func K8SConfigMapInfoX(conds map[string]interface{}) (resp K8SConfigMap, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("K8SConfigMapInfoX infoX error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapListX get single item by condition
func K8SConfigMapListX(conds map[string]interface{}) (resp []K8SConfigMap, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("K8SConfigMapListX infoX error", zap.Error(err))
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
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("cluster info error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapDelete soft delete item by id
func K8SConfigMapDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(K8SConfigMap{}).Delete(&K8SConfigMap{}, id).Error; err != nil {
		invoker.Logger.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

// K8SConfigMapList return item list by condition
func K8SConfigMapList(conds egorm.Conds) (resp []*K8SConfigMap, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameK8SConfigMap).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list clusters error", elog.String("err", err.Error()))
		return
	}
	return
}

// K8SConfigMapListPage return item list by pagination
func K8SConfigMapListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*K8SConfigMap) {
	respList = make([]*K8SConfigMap, 0)
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

func (m *Cluster) Key() string {
	return utils.MD5(fmt.Sprintf("%s-%s-%s", m.Name, m.ApiServer, m.KubeConfig))
}

// ClusterCreate CRUD
func ClusterCreate(db *gorm.DB, data *Cluster) (err error) {
	if err = db.Create(data).Error; err != nil {
		invoker.Logger.Error("create cluster error", zap.Error(err))
		return
	}
	return
}

// ClusterUpdate ...
func ClusterUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameCluster).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update cluster error", zap.Error(err))
		return
	}
	return
}

func ClusterInfo(paramId int) (resp Cluster, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("cluster info error", zap.Error(err))
		return
	}
	resp.KubeConfig = json2yaml(resp.KubeConfig)
	return
}

func ClusterNormalInfo(paramId int) (resp Cluster, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("cluster info error", zap.Error(err))
		return
	}
	return
}

func ClusterUpdateX(db *gorm.DB, conds egorm.Conds, ups map[string]interface{}) (err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameCluster).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("updateX cluster error", zap.Error(err))
		return
	}
	return
}

// ClusterInfoX get single item by condition
func ClusterInfoX(db *gorm.DB, conds map[string]interface{}) (resp Cluster, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameCluster).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("cluster infoX error", zap.Error(err))
		return
	}
	resp.KubeConfig = json2yaml(resp.KubeConfig)
	return
}

// ClusterList return item list by condition
func ClusterList(conds egorm.Conds) (resp []*Cluster, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list clusters error", zap.Error(err))
		return
	}
	for _, cluster := range resp {
		cluster.KubeConfig = json2yaml(cluster.KubeConfig)
	}
	return
}

func ClusterNormalList(conds egorm.Conds) (resp []*Cluster, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list clusters error", zap.Error(err))
		return
	}
	return
}

// GetAllNormalClusters 获取当前所有未删除且状态正常的clusters; 主要供后端调用.
func GetAllNormalClusters() (result []*Cluster, err error) {
	conds := egorm.Conds{
		"status": ClusterStatusNormal,
	}
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&result).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("get all normal clusters failed", zap.Error(err))
		return
	}
	return
}

func ClusterListHideSensitiveInfo(conds egorm.Conds) (resp []*Cluster, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameCluster).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list clusters error", zap.Error(err))
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
		cluster.KubeConfig = json2yaml(cluster.KubeConfig)
	}
	return
}

// ClusterDelete soft delete item by id
func ClusterDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Cluster{}).Unscoped().Delete(&Cluster{}, id).Error; err != nil {
		invoker.Logger.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

func json2yaml(jsonStr string) string {
	y, _ := yaml.JSONToYAML([]byte(jsonStr))
	return string(y)
}

type OAuthToken struct {
	*oauth2.Token
}

func (t OAuthToken) Value() (driver.Value, error) {
	b, err := json.Marshal(t)
	return string(b), err
}

func (t *OAuthToken) Scan(input interface{}) error {
	return json.Unmarshal(input.([]byte), t)
}

// UserCreate CRUD
func UserCreate(db *gorm.DB, data *User) (err error) {
	if err = db.Create(data).Error; err != nil {
		invoker.Logger.Error("create cluster error", zap.Error(err))
		return
	}
	return
}

// UserUpdate ...
func UserUpdate(db *gorm.DB, paramId int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{paramId}
	if err = db.Table(TableNameUser).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("update cluster error", zap.Error(err))
		return
	}
	return
}

func UserInfo(paramId int) (resp User, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{paramId}
	if err = invoker.Db.Table(TableNameUser).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("cluster info error", zap.Error(err))
		return
	}
	return
}

// UserInfoX get single item by condition
func UserInfoX(conds map[string]interface{}) (resp User, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Table(TableNameUser).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("UserInfoX infoX error", zap.Error(err))
		return
	}
	return
}

// UserDelete soft delete item by id
func UserDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(User{}).Delete(&User{}, id).Error; err != nil {
		invoker.Logger.Error("cluster delete error", zap.Error(err))
		return
	}
	return
}

// UserList return item list by condition
func UserList(conds egorm.Conds) (resp []*User, err error) {
	sql, binds := egorm.BuildQuery(conds)
	// Fetch record with Rancher Info....
	if err = invoker.Db.Table(TableNameUser).Where(sql, binds...).Find(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("list clusters error", elog.String("err", err.Error()))
		return
	}
	return
}

// UserListPage return item list by pagination
func UserListPage(conds egorm.Conds, reqList *ReqPage) (total int64, respList []*User) {
	respList = make([]*User, 0)
	if reqList.PageSize == 0 {
		reqList.PageSize = 10
	}
	if reqList.Current == 0 {
		reqList.Current = 1
	}
	sql, binds := egorm.BuildQuery(conds)
	db := invoker.Db.Table(TableNameUser).Where(sql, binds...)
	db.Count(&total)
	db.Offset((reqList.Current - 1) * reqList.PageSize).Limit(reqList.PageSize).Find(&respList)
	return
}
