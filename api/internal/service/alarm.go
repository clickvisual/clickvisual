package service

import (
	"errors"
	"fmt"
	"io/ioutil"
	"sort"
	"strings"

	"github.com/gotomicro/ego/core/elog"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/service/inquiry"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/resource"
	"github.com/shimohq/mogo/api/pkg/constx"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

const (
	RuleStoreTypeFile = 1
	RuleStoreTypeK8s  = 2
)

type alarm struct{}

// NewAlarm ...
func NewAlarm() *alarm {
	return &alarm{}
}

func (i *alarm) FilterCreate(tx *gorm.DB, alertID int, filters []view.ReqAlarmFilterCreate) (res []*db.AlarmFilter, err error) {
	res = make([]*db.AlarmFilter, 0)
	for _, filter := range filters {
		filterObj := &db.AlarmFilter{
			AlarmId:        alertID,
			Tid:            filter.Tid,
			When:           filter.When,
			SetOperatorTyp: filter.SetOperatorTyp,
			SetOperatorExp: filter.SetOperatorExp,
		}
		if filterObj.When == "" {
			filterObj.When = "1=1"
		}
		err = db.AlarmFilterCreate(tx, filterObj)
		if err != nil {
			return
		}
		res = append(res, filterObj)
	}
	return
}

func (i *alarm) ConditionCreate(tx *gorm.DB, obj *db.Alarm, conditions []view.ReqAlarmConditionCreate) (exp string, err error) {
	expVal := fmt.Sprintf("%s{%s}", obj.Name, inquiry.TagsToString(obj, false))
	sort.Slice(conditions, func(i, j int) bool {
		return conditions[i].SetOperatorTyp < conditions[j].SetOperatorTyp
	})
	for _, condition := range conditions {
		var innerCond string
		switch condition.Cond {
		case 0:
			innerCond = fmt.Sprintf("%s>%d", expVal, condition.Val1)
		case 1:
			innerCond = fmt.Sprintf("%s<%d", expVal, condition.Val1)
		case 2:
			innerCond = fmt.Sprintf("%s<%d and %s>%d", expVal, condition.Val1, expVal, condition.Val2)
		case 3:
			innerCond = fmt.Sprintf("%s>=%d and %s<=%d", expVal, condition.Val1, expVal, condition.Val2)
		}
		switch condition.SetOperatorTyp {
		case 0:
			exp = innerCond
		case 1:
			if exp == "" {
				err = errors.New("conditions error")
				return
			}
			exp = fmt.Sprintf("%s and %s", exp, innerCond)
		case 2:
			if exp == "" {
				err = errors.New("conditions error")
				return
			}
			exp = fmt.Sprintf("%s or %s", exp, innerCond)
		}
		conditionObj := &db.AlarmCondition{
			AlarmId:        obj.ID,
			SetOperatorTyp: condition.SetOperatorTyp,
			SetOperatorExp: condition.SetOperatorExp,
			Cond:           condition.Cond,
			Val1:           condition.Val1,
			Val2:           condition.Val2,
		}
		err = db.AlarmConditionCreate(tx, conditionObj)
		if err != nil {
			return
		}
	}
	return
}

func (i *alarm) RuleStore(tx *gorm.DB, instance db.Instance, obj *db.Alarm, exp string) (err error) {
	elog.Debug("alert", elog.Any("instance", instance))
	client, err := kube.ClusterManager.GetClusterManager(instance.ClusterId)
	if err != nil {
		tx.Rollback()
		return
	}
	template := `groups:
- name: default
  rules:
  - alert: %s
    expr: %s
    for: %s
    labels:
      severity: warning
    annotations:
      summary: "告警 {{ $labels.name }}"
      description: "{{ $labels.desc }}  (当前值: {{ $value }})"`
	newRule := fmt.Sprintf(template, obj.Name, exp, obj.AlertInterval())
	switch instance.RuleStoreType {
	case RuleStoreTypeK8s:
		rule := make(map[string]string)
		rule[obj.AlertRuleName()] = newRule
		elog.Debug("alert", elog.Any("rule", rule))
		err = resource.ConfigmapCreateOrUpdate(client, instance.Namespace, instance.Configmap, rule)
		if err != nil {
			return
		}
	case RuleStoreTypeFile:
		content := []byte(newRule)
		path := strings.TrimSuffix(instance.FilePath, "/")
		err = ioutil.WriteFile(path+"/"+obj.AlertRuleName(), content, 0644)
		if err != nil {
			return
		}
	default:
		return constx.ErrAlarmRuleStoreIsClosed
	}
	return nil
}
