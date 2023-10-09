package resource

import (
	"context"
	"fmt"

	"github.com/pkg/errors"
	monitoringv1 "github.com/prometheus-operator/prometheus-operator/pkg/apis/monitoring/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/clickvisual/clickvisual/api/internal/pkg/kube"
	"github.com/clickvisual/clickvisual/api/internal/pkg/kube/api"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

// CreateOrUpdatePrometheusRule 存在出现脏数据可能
func CreateOrUpdatePrometheusRule(client *kube.ClusterClient, groupName string, po db.ConfigPrometheusOperator, rules []monitoringv1.Rule) error {
	obj, err := client.KubeClient.Get(api.ResourceNamePrometheusRule, po.MetaData.Namespace, po.MetaData.Name)
	if NotFound(err) {
		if err = createPrometheusRule(client, groupName, po, rules); err != nil {
			return errors.WithMessagef(err, "namespace: %s, ruleName: %s", po.MetaData.Namespace, po.MetaData.Name)
		}
		return nil
	}
	// 组装
	prometheusRules := obj.(*monitoringv1.PrometheusRule)
	var idx = -1
	for i, group := range prometheusRules.Spec.Groups {
		if group.Name == groupName {
			idx = i
		}
	}
	prometheusRules.Kind = api.KindNamePrometheusRule
	prometheusRules.APIVersion = monitoringv1.SchemeGroupVersion.String()
	if len(prometheusRules.Labels) == 0 {
		prometheusRules.Labels = make(map[string]string)
	}
	prometheusRules.Labels = po.MetaData.Labels
	prometheusRules.Name = po.MetaData.Name
	prometheusRules.Namespace = po.MetaData.Namespace
	if idx != -1 {
		// 更新已有规则
		prometheusRules.Spec.Groups[idx].Rules = rules
	} else {
		// 新建 clickvisual 配置
		clickvisualGroup := monitoringv1.RuleGroup{
			Name:  groupName,
			Rules: rules,
		}
		groups := make([]monitoringv1.RuleGroup, 0)
		groups = append(groups, clickvisualGroup)
		prometheusRules.Spec.Groups = append(prometheusRules.Spec.Groups, groups...)
	}
	return updatePrometheusRule(client, po.MetaData.Namespace, po.MetaData.Name, prometheusRules)
}

func DeletePrometheusRuleByGroupName(clusterId int, namespace, name string, groupName string) error {
	client, err := kube.ClusterManager.GetClusterManager(clusterId)
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("cluster data acquisition failed: %s, cluster id: %d", err.Error(), clusterId))
	}
	obj, err := client.KubeClient.Get(api.ResourceNamePrometheusRule, namespace, name)
	if err != nil {
		if NotFound(err) {
			return nil
		}
		return errors.Wrap(err, "Get PrometheusRule failed, in cluster")
	}
	prometheusRules := obj.(*monitoringv1.PrometheusRule)
	var groups = make([]monitoringv1.RuleGroup, 0)
	for _, group := range prometheusRules.Spec.Groups {
		if group.Name == groupName {
			continue
		}
		groups = append(groups, group)
	}
	prometheusRules.Spec.Groups = groups
	return updatePrometheusRule(client, namespace, name, prometheusRules)
}

func createPrometheusRule(client *kube.ClusterClient, groupName string, po db.ConfigPrometheusOperator, rules []monitoringv1.Rule) error {
	// 新建 clickvisual 配置
	clickvisualGroup := monitoringv1.RuleGroup{
		Name:  groupName,
		Rules: rules,
	}
	groups := make([]monitoringv1.RuleGroup, 0)
	groups = append(groups, clickvisualGroup)
	prometheusRule := monitoringv1.PrometheusRule{
		TypeMeta: metav1.TypeMeta{
			Kind:       api.KindNamePrometheusRule,
			APIVersion: monitoringv1.SchemeGroupVersion.String(),
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      po.MetaData.Name,
			Namespace: po.MetaData.Namespace,
			Labels:    po.MetaData.Labels,
		},
		Spec: monitoringv1.PrometheusRuleSpec{
			Groups: groups,
		},
	}
	_, err := client.KubeClient.GetClientVersioned().MonitoringV1().PrometheusRules(po.MetaData.Namespace).
		Create(context.Background(), &prometheusRule, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	return nil
}

func updatePrometheusRule(client *kube.ClusterClient, namespace, ruleName string, rule *monitoringv1.PrometheusRule) error {
	_, err := client.KubeClient.GetClientVersioned().MonitoringV1().PrometheusRules(namespace).
		Update(context.Background(), rule, metav1.UpdateOptions{})
	if err != nil {
		return errors.Wrapf(err, "namespace is %s, ruleName is %s", namespace, ruleName)
	}
	return nil
}
