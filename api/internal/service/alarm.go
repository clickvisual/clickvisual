package service

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
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

const prometheusRuleTemplate = `groups:
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

func (i *alarm) PrometheusReload(prometheusTarget string) (err error) {
	resp, err := http.Post(strings.TrimSuffix(prometheusTarget, "/")+"/-/reload", "text/html;charset=utf-8", nil)
	if err != nil {
		elog.Error("reload", elog.Any("reload", prometheusTarget+"/-/reload"), elog.Any("err", err.Error()))
		return
	}
	defer func() { _ = resp.Body.Close() }()
	return
}

func (i *alarm) PrometheusRuleGen(obj *db.Alarm, exp string) (rule string, err error) {
	rule = fmt.Sprintf(prometheusRuleTemplate, obj.Name, exp, obj.AlertInterval())
	return
}

func (i *alarm) PrometheusRuleCreateOrUpdate(instance db.Instance, obj *db.Alarm, rule string) (err error) {
	switch instance.RuleStoreType {
	case RuleStoreTypeK8s:
		elog.Debug("alert", elog.Any("instance", instance))
		client, errCluster := kube.ClusterManager.GetClusterManager(instance.ClusterId)
		if errCluster != nil {
			return errCluster
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
		return constx.ErrAlarmRuleStoreIsClosed
	}
	if err = i.PrometheusReload(instance.PrometheusTarget); err != nil {
		return
	}
	return nil
}

func (i *alarm) PrometheusRuleDelete(instance *db.Instance, obj *db.Alarm) (err error) {
	elog.Debug("alert", elog.Any("instance", instance), elog.Any("obj", obj))

	if obj.RuleStoreType != instance.RuleStoreType {
		return constx.ErrPrometheusRuleStoreTypeNotMatch
	}
	switch instance.RuleStoreType {
	case RuleStoreTypeK8s:
		elog.Debug("alert", elog.Any("instance", instance))
		client, errCluster := kube.ClusterManager.GetClusterManager(instance.ClusterId)
		if errCluster != nil {
			return errCluster
		}
		rules := make(map[string]string)
		delete(rules, obj.AlertRuleName())
		elog.Debug("alert", elog.Any("rules", rules))
		err = resource.ConfigmapCreateOrUpdate(client, instance.Namespace, instance.Configmap, rules)
		if err != nil {
			return
		}
	case RuleStoreTypeFile:
		path := strings.TrimSuffix(instance.FilePath, "/")
		err = os.Remove(path + "/" + obj.AlertRuleName())
		if err != nil {
			return
		}
	default:
		return constx.ErrAlarmRuleStoreIsClosed
	}
	if err = i.PrometheusReload(instance.PrometheusTarget); err != nil {
		return
	}
	return nil
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
	tableInfo, err := db.TableInfo(tx, obj.Tid)
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
	if obj.ViewTableName != "" {
		err = op.AlertViewDrop(obj.ViewTableName)
		if err != nil {
			elog.Error("alarm", elog.String("step", "alarm create failed 05"), elog.String("err", err.Error()))
			return
		}
	}
	// gen view table name & sql
	viewTableName, viewSQL, err := op.AlertViewGen(obj, filtersDB)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 06"), elog.String("err", err.Error()))
		return
	}
	// exec view sql
	if err = op.AlertViewCreate(viewTableName, viewSQL); err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 07"), elog.String("err", err.Error()))
		return
	}
	// rule store
	rule, err := i.PrometheusRuleGen(obj, exp)
	if err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 08"), elog.String("err", err.Error()))
		return
	}
	if err = i.PrometheusRuleCreateOrUpdate(instance, obj, rule); err != nil {
		elog.Error("alarm", elog.String("step", "alarm create failed 09"), elog.String("err", err.Error()))
		return
	}
	ups := make(map[string]interface{}, 0)
	ups["view"] = viewSQL
	ups["alert_rule"] = rule
	ups["view_table_name"] = viewTableName
	ups["rule_store_type"] = instance.RuleStoreType
	ups["status"] = db.AlarmStatusOpen
	err = db.AlarmUpdate(tx, obj.ID, ups)
	return nil
}

func (i *alarm) OpenOperator(id int) (err error) {
	instanceInfo, _, alarmInfo, err := db.GetAlarmTableInstanceInfo(id)
	if err != nil {
		return
	}
	if err = i.PrometheusRuleCreateOrUpdate(instanceInfo, &alarmInfo, alarmInfo.AlertRule); err != nil {
		elog.Error("alarm", elog.String("step", "prometheus rule delete failed"), elog.String("err", err.Error()))
		return
	}
	if err = db.AlarmUpdate(invoker.Db, id, map[string]interface{}{"status": db.AlarmStatusOpen}); err != nil {
		return
	}
	return
}

func (i *alarm) Update(uid, alarmId int, req view.ReqAlarmCreate) (err error) {
	if req.Name == "" || req.Interval == 0 || len(req.ChannelIds) == 0 {
		return errors.New("parameter error")
	}

	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	ups["name"] = req.Name
	ups["desc"] = req.Desc
	ups["interval"] = req.Interval
	ups["unit"] = req.Unit
	ups["uid"] = uid
	ups["channel_ids"] = db.Ints(req.ChannelIds)
	if err = db.AlarmUpdate(tx, alarmId, ups); err != nil {
		tx.Rollback()
		return
	}
	// filter
	if err = db.AlarmFilterDeleteBatch(tx, alarmId); err != nil {
		tx.Rollback()
		return
	}
	// condition
	if err = db.AlarmConditionDeleteBatch(tx, alarmId); err != nil {
		tx.Rollback()
		return
	}
	obj, err := db.AlarmInfo(tx, alarmId)
	if err != nil {
		tx.Rollback()
		return
	}
	if err = i.CreateOrUpdate(tx, &obj, req); err != nil {
		tx.Rollback()
		return
	}
	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		return
	}
	return
}
