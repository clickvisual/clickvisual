package db

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"

	"github.com/gotomicro/ego-component/egorm"
	"go.uber.org/zap"
)

// Instance 服务配置存储
type Instance struct {
	BaseModel

	Datasource       string `gorm:"column:datasource;type:varchar(32);NOT NULL;index:idx_datasource_name,unique" json:"datasource"` // 数据源类型
	Name             string `gorm:"column:name;type:varchar(128);NOT NULL;index:idx_datasource_name,unique" json:"name"`            // 实例名称
	Dsn              string `gorm:"column:dsn;type:text" json:"dsn"`                                                                // dsn
	RuleStoreType    int    `gorm:"column:rule_store_type;type:int(11)" json:"ruleStoreType"`                                       // rule_store_type 0 集群 1 文件
	FilePath         string `gorm:"column:file_path;type:varchar(255)" json:"filePath"`                                             // file_path
	ClusterId        int    `gorm:"column:cluster_id;type:int(11)" json:"clusterId"`                                                // cluster_id
	Namespace        string `gorm:"column:namespace;type:varchar(128);NOT NULL" json:"namespace"`                                   // namespace
	Configmap        string `gorm:"column:configmap;type:varchar(128);NOT NULL" json:"configmap"`                                   // configmap
	PrometheusTarget string `gorm:"column:prometheus_target;type:varchar(128);NOT NULL" json:"prometheusTarget"`                    // prometheus ip or domain, eg: https://prometheus:9090
}

func (t *Instance) TableName() string {
	return TableNameInstance
}

func (t *Instance) DsKey() string {
	return InstanceKey(t.ID)
}

func InstanceKey(id int) string {
	return fmt.Sprintf("%d", id)
}

const (
	DatasourceMySQL      = "mysql"
	DatasourceClickHouse = "ch"
)

// InstanceList ..
func InstanceList(conds egorm.Conds, extra ...string) (resp []*Instance, err error) {
	sql, binds := egorm.BuildQuery(conds)
	sorts := ""
	if len(extra) >= 1 {
		sorts = extra[0]
	}
	if sorts == "" {
		sorts = "id desc"
	}
	if err = invoker.Db.Model(Instance{}).Where(sql, binds...).Order(sorts).Find(&resp).Error; err != nil {
		invoker.Logger.Error("ConfigMap list error", zap.Error(err))
		return
	}
	return
}

func InstanceCreate(db *gorm.DB, data *Instance) (err error) {
	if err = db.Model(Instance{}).Create(data).Error; err != nil {
		invoker.Logger.Error("create release error", zap.Error(err))
		return
	}
	return
}

func InstanceByName(dt, name string) (resp Instance, err error) {
	var sql = "`datasource`= ? and `name`=? and dtime = 0"
	var binds = []interface{}{dt, name}
	if err = invoker.Db.Model(Instance{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func InstanceInfo(db *gorm.DB, id int) (resp Instance, err error) {
	var sql = "`id`= ? and dtime = 0"
	var binds = []interface{}{id}
	if err = db.Model(Instance{}).Where(sql, binds...).First(&resp).Error; err != nil {
		invoker.Logger.Error("release info error", zap.Error(err))
		return
	}
	return
}

func InstanceDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(Instance{}).Unscoped().Delete(&Instance{}, id).Error; err != nil {
		invoker.Logger.Error("release delete error", zap.Error(err))
		return
	}
	return
}

func InstanceUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(Instance{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		invoker.Logger.Error("release update error", zap.Error(err))
		return
	}
	return
}

// InstanceInfoX Info extension method to query a single record according to Cond
func InstanceInfoX(db *gorm.DB, conds map[string]interface{}) (resp Instance, err error) {
	conds["dtime"] = 0
	sql, binds := egorm.BuildQuery(conds)
	if err = db.Table(TableNameInstance).Where(sql, binds...).First(&resp).Error; err != nil && err != gorm.ErrRecordNotFound {
		invoker.Logger.Error("infoX error", zap.Error(err))
		return
	}
	return
}
