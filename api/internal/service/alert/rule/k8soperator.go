package rule

import (
	"fmt"
	"sync"

	"github.com/pkg/errors"
	monitoringv1 "github.com/prometheus-operator/prometheus-operator/pkg/apis/monitoring/v1"
	"gopkg.in/yaml.v3"
	"k8s.io/apimachinery/pkg/util/intstr"

	"github.com/clickvisual/clickvisual/api/internal/service/kube"
	"github.com/clickvisual/clickvisual/api/internal/service/kube/resource"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

var _ Component = (*k8sOperator)(nil)

// k8sOperator Object resource pool
var resourcePoolK8sOperator sync.Map

type k8sOperator struct {
	md5                string
	iid                int
	clusterId          int
	prometheusOperator db.ConfigPrometheusOperator
}

func NewK8sOperator(params *Params) (*k8sOperator, error) {
	nmd5 := params.md5()
	if v, ok := resourcePoolK8sOperator.Load(params.InstanceID); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new")
		}
		obj, typeOk := v.(*k8sOperator)
		if !typeOk {
			return nil, errors.Wrap(ErrNilObject, "type")
		}
		if obj.md5 == nmd5 {
			return obj, nil
		}
	}
	var po db.ConfigPrometheusOperator
	err := yaml.Unmarshal([]byte(params.PrometheusOperator), &po)
	if err != nil {
		return nil, errors.Wrap(err, params.PrometheusOperator)
	}
	p := &k8sOperator{
		iid:                params.InstanceID,
		md5:                nmd5,
		clusterId:          params.ClusterId,
		prometheusOperator: po,
	}
	resourcePoolK8sOperator.Store(params.InstanceID, p)
	return p, nil
}

func (r *k8sOperator) CreateOrUpdate(groupName, ruleName, content string) error {
	return ErrNotYetSupported
}

func (r *k8sOperator) Delete(groupName, ruleName string) error {
	return ErrNotYetSupported
}

func (r *k8sOperator) BatchSet(groupName string, rules []db.ClusterRuleItem) error {
	if r.clusterId == 0 ||
		r.prometheusOperator.MetaData.Namespace == "" ||
		r.prometheusOperator.MetaData.Name == "" {
		return errors.Wrapf(ErrParameter, "rule prometheus operator is valid: %v", r.prometheusOperator)
	}
	client, err := kube.ClusterManager.GetClusterManager(r.clusterId)
	if err != nil {
		return err
	}
	monitoringV1Rules := make([]monitoringv1.Rule, 0)
	for _, rule := range rules {
		ruleGroup := OperatorRuleGroups{}
		if err = yaml.Unmarshal([]byte(rule.Content), &ruleGroup); err != nil {
			return errors.Wrapf(err, "rule: %s", rule.Content)
		}
		if len(ruleGroup.Groups) != 1 && len(ruleGroup.Groups[0].Rules) != 1 {
			return errors.New(fmt.Sprintf("format error and rule is: %s", rule.Content))
		}
		monitoringV1Rules = append(monitoringV1Rules, ruleGroup.Groups[0].Rules[0].Conversion())
	}
	err = resource.CreateOrUpdatePrometheusRule(client, groupName, r.prometheusOperator, monitoringV1Rules)
	if err != nil {
		return err
	}
	return nil
}

func (r *k8sOperator) BatchRemove(groupName string) error {
	if r.clusterId == 0 ||
		r.prometheusOperator.MetaData.Namespace == "" ||
		r.prometheusOperator.MetaData.Name == "" {
		return errors.Wrapf(ErrParameter, "rule: %v", r)
	}
	if err := resource.DeletePrometheusRuleByGroupName(r.clusterId, r.prometheusOperator.MetaData.Namespace, r.prometheusOperator.MetaData.Name, groupName); err != nil {
		return err
	}
	return nil
}

type OperatorRuleGroups struct {
	Groups []OperatorRuleGroup `yaml:"groups,omitempty"`
}

type OperatorRuleGroup struct {
	Name                    string         `yaml:"name"`
	Interval                string         `yaml:"interval,omitempty"`
	Rules                   []OperatorRule `yaml:"rules"`
	PartialResponseStrategy string         `yaml:"partial_response_strategy,omitempty"`
}

type OperatorRule struct {
	Record      string            `yaml:"record,omitempty"`
	Alert       string            `yaml:"alert,omitempty"`
	Expr        string            `yaml:"expr"`
	For         string            `yaml:"for,omitempty"`
	Labels      map[string]string `yaml:"labels,omitempty"`
	Annotations map[string]string `yaml:"annotations,omitempty"`
}

func (r OperatorRule) Conversion() monitoringv1.Rule {
	return monitoringv1.Rule{
		Record: r.Record,
		Alert:  r.Alert,
		Expr: intstr.IntOrString{
			Type:   intstr.String,
			StrVal: r.Expr,
		},
		For:         r.For,
		Labels:      r.Labels,
		Annotations: r.Annotations,
	}
}
