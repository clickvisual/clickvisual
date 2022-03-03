package service

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"strings"

	"github.com/gotomicro/ego/core/elog"
	"gorm.io/gorm"

	"github.com/shimohq/mogo/api/internal/invoker"
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

func (i *alarm) RuleStore(instance db.Instance, obj *db.Alarm, exp string) (rule string, err error) {
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
	rule = fmt.Sprintf(template, obj.Name, exp, obj.AlertInterval())
	switch instance.RuleStoreType {
	case RuleStoreTypeK8s:
		elog.Debug("alert", elog.Any("instance", instance))
		client, errCluster := kube.ClusterManager.GetClusterManager(instance.ClusterId)
		if errCluster != nil {
			return rule, errCluster
		}
		rules := make(map[string]string)
		rules[obj.AlertRuleName()] = rule
		elog.Debug("alert", elog.Any("rules", rules))
		err = resource.ConfigmapCreateOrUpdate(client, instance.Namespace, instance.Configmap, rules)
		if err != nil {
			return
		}
	case RuleStoreTypeFile:
		content := []byte(rule)
		path := strings.TrimSuffix(instance.FilePath, "/")
		err = ioutil.WriteFile(path+"/"+obj.AlertRuleName(), content, 0644)
		if err != nil {
			return
		}
	default:
		return rule, constx.ErrAlarmRuleStoreIsClosed
	}
	return rule, nil
}

func (i *alarm) CreateOrUpdate(tx *gorm.DB, obj *db.Alarm, req view.ReqAlarmCreate) (err error) {
	filtersDB, err := i.FilterCreate(tx, obj.ID, req.Filters)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 02"), elog.String("err", err.Error()))
		return
	}
	exp, err := i.ConditionCreate(tx, obj, req.Conditions)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 03"), elog.String("err", err.Error()))
		return
	}
	// table info
	tableInfo, err := db.TableInfo(invoker.Db, obj.Tid)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm table info"), elog.String("err", err.Error()))
		return
	}
	// prometheus set
	instance, err := db.InstanceInfo(tx, tableInfo.Database.Iid)
	if err != nil {
		elog.Error("alarm", elog.String("step", "you need to configure alarms related to the instance first:"), elog.String("err", err.Error()))
		return
	}
	op, err := InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 04"), elog.String("err", err.Error()))
		return
	}
	// view set
	viewSQL, err := op.AlertViewCreate(obj, filtersDB)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 05"), elog.String("err", err.Error()))
		return
	}
	// rule store
	rule, err := i.RuleStore(instance, obj, exp)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 06"), elog.String("err", err.Error()))
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["view"] = viewSQL
	ups["alert_rule"] = rule
	err = db.AlarmUpdate(tx, obj.ID, ups)
	resp, errReload := http.Post(strings.TrimSuffix(instance.PrometheusTarget, "/")+"/-/reload", "text/html;charset=utf-8", nil)
	if errReload != nil {
		elog.Error("reload", elog.Any("reload", instance.PrometheusTarget+"/-/reload"), elog.Any("err", errReload.Error()))
		return
	}
	defer func() { _ = resp.Body.Close() }()
	return nil
}
