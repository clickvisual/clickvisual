package rule

import (
	"crypto/md5"
	"fmt"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

var (
	ErrNilObject       = errors.New("there is something wrong with the object in the resource pool")
	ErrParameter       = errors.New("parameter error")
	ErrNotYetSupported = errors.New("not yet supported")
)

type Component interface {
	// Delete v1 ...
	Delete(groupName, ruleName string) error
	CreateOrUpdate(groupName, ruleName, content string) error
	// BatchRemove v2 ...
	BatchRemove(groupName string) error
	BatchSet(groupName string, rules []db.ClusterRuleItem) error
}

type Params struct {
	InstanceID int
	// file system
	RulePath string
	// k8s configmap
	ClusterId int
	Namespace string
	Configmap string
	// k8s operator
	PrometheusOperator string
}

func (p *Params) md5() string {
	has := md5.New() // 创建md5算法
	has.Write([]byte(fmt.Sprintf("%d_%s_%d_%s_%s_%s",
		p.InstanceID,
		p.RulePath,
		p.ClusterId,
		p.Namespace,
		p.Configmap,
		p.PrometheusOperator,
	))) // 写入需要加密的数据
	b := has.Sum(nil) // 获取hash值字符切片；Sum函数接受一个字符切片，这个切片的内容会原样的追加到abc123加密
	return string(b)
}

// GetComponent 每个 storeType 下
// instance 和 cluster 是一对一的关系
// 一个 cluster 下会有多个 instance 使用不同的 storeType
func GetComponent(storeType int, params *Params) (Component, error) {
	switch storeType {
	case db.RuleStoreTypeFile:
		return NewFileSystem(params)
	case db.RuleStoreTypeK8sConfigMap:
		return NewK8sConfigMap(params)
	case db.RuleStoreTypeK8sOperator:
		return NewK8sOperator(params)
	}
	return nil, errors.Wrapf(ErrParameter, "storeType: %d", storeType)
}
