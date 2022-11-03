package service

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/alert/alertcomponent"
	"github.com/clickvisual/clickvisual/api/internal/service/alert/rule"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
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

const (
	reloadTimes    = 30
	reloadInterval = time.Second * 5
)

const (
	NoDataOpDefault = 0
	NoDataOpOK      = 1
	NoDataOpAlert   = 2
)

var _ iAlarm = (*alarm)(nil)

type iAlarm interface {
	FilterCreate(tx *gorm.DB, alarmObj *db.Alarm, filters []view.ReqAlarmFilterCreate) (res map[int]view.AlarmFilterItem, err error)
	ConditionCreate(tx *gorm.DB, obj *db.Alarm, conditions []view.ReqAlarmConditionCreate, filterId int) (exp string, err error)
	PrometheusReload(prometheusTarget string) (err error)
	PrometheusRuleGen(obj *db.Alarm, exp string, filterId int) string
	PrometheusRuleCreateOrUpdate(instance db.BaseInstance, name, content string) (err error)
	PrometheusRuleDelete(instance *db.BaseInstance, obj *db.Alarm) (err error)
	CreateOrUpdate(tx *gorm.DB, alarmObj *db.Alarm, req view.ReqAlarmCreate) (err error)
	OpenOperator(id int) (err error)
	Update(uid, alarmId int, req view.ReqAlarmCreate) (err error)
	AddPrometheusReloadChan()
	IsAllClosed(instanceId int) (err error)
}

type alarm struct {
	reloadChan chan int64
}

// NewAlarm ...
func NewAlarm() *alarm {
	a := &alarm{
		reloadChan: make(chan int64, reloadTimes),
	}
	go func() {
		for r := range a.reloadChan {
			invoker.Logger.Info("AllPrometheusReload", elog.Int("times", len(a.reloadChan)), elog.Int64("r", r), elog.Int64("now", time.Now().Unix()))
			AllPrometheusReload()
			core.LoggerError("alarm", "ruleReload", AlertRuleCheck())
			time.Sleep(reloadInterval)
		}
	}()
	a.reloadChan <- time.Now().Unix()
	return a
}

func (i *alarm) FilterCreate(tx *gorm.DB, alarmObj *db.Alarm, filters []view.ReqAlarmFilterCreate) (res map[int]view.AlarmFilterItem, err error) {
	res = make(map[int]view.AlarmFilterItem, 0)
	for _, filter := range filters {
		// create filter
		filterObj := &db.AlarmFilter{
			AlarmId:        alarmObj.ID,
			Tid:            filter.Tid,
			When:           filter.When,
			SetOperatorTyp: filter.SetOperatorTyp,
			SetOperatorExp: filter.SetOperatorExp,
			Mode:           filter.Mode,
		}
		if filterObj.When == "" {
			filterObj.When = "1=1"
		}
		err = db.AlarmFilterCreate(tx, filterObj)
		if err != nil {
			return
		}
		row := view.AlarmFilterItem{
			AlarmFilter: filterObj,
		}
		// create condition
		row.Exp, err = i.ConditionCreate(tx, alarmObj, filter.Conditions, filterObj.ID)
		if err != nil {
			return
		}
		res[filterObj.ID] = row
	}
	return
}

func (i *alarm) ConditionCreate(tx *gorm.DB, obj *db.Alarm, conditions []view.ReqAlarmConditionCreate, filterId int) (exp string, err error) {
	expVal := fmt.Sprintf("%s{%s} offset 10s", bumo.PrometheusMetricName, inquiry.TagsToString(obj, false, filterId))
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
			innerCond = fmt.Sprintf("(%s<%d or %s>%d)", expVal, condition.Val1, expVal, condition.Val2)
		case 3:
			innerCond = fmt.Sprintf("(%s>=%d and %s<=%d)", expVal, condition.Val1, expVal, condition.Val2)
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
			FilterId:       filterId,
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

	// empty data alert
	exp = aggregationOp(obj.Mode, exp, expVal)
	exp = noDataOp(obj.NoDataOp, exp, expVal)
	return
}

func (i *alarm) PrometheusReload(prometheusTarget string) (err error) {
	resp, err := http.Post(strings.TrimSuffix(prometheusTarget, "/")+"/-/reload", "text/html;charset=utf-8", nil)
	if err != nil {
		invoker.Logger.Error("reload", elog.Any("reload", prometheusTarget+"/-/reload"), elog.Any("err", err.Error()))
		return
	}
	defer func() { _ = resp.Body.Close() }()
	return
}

func (i *alarm) PrometheusRuleGen(obj *db.Alarm, exp string, filterId int) string {
	return fmt.Sprintf(prometheusRuleTemplate, obj.UniqueName(filterId), exp, obj.AlertInterval())
}

func (i *alarm) PrometheusRuleCreateOrUpdate(instance db.BaseInstance, name, content string) (err error) {
	rc, err := rule.GetComponent(instance.RuleStoreType, &rule.Params{
		InstanceID: instance.ID,
		RulePath:   instance.FilePath,
		ClusterId:  instance.ClusterId,
		Namespace:  instance.Namespace,
		Configmap:  instance.Configmap,
	})
	if err != nil {
		return err
	}
	if err = rc.CreateOrUpdate(name, content); err != nil {
		return
	}
	i.AddPrometheusReloadChan()
	return nil
}

func (i *alarm) PrometheusRuleDelete(instance *db.BaseInstance, obj *db.Alarm) (err error) {
	if obj.AlertRules == nil || len(obj.AlertRules) == 0 {
		// v1 version
		return alarmRuleDelete(instance, obj.RuleName(0))
	} else {
		// v2 version
		for iidRuleName := range obj.AlertRules {
			ruleName := iidRuleName
			ins := *instance
			iidTableArr := strings.Split(iidRuleName, "|")
			if len(iidTableArr) == 2 {
				ruleName = iidTableArr[1]
				iid, _ := strconv.Atoi(iidTableArr[0])
				ins, _ = db.InstanceInfo(invoker.Db, iid)
			}
			if err = alarmRuleDelete(&ins, ruleName); err != nil {
				return
			}
		}
	}
	i.AddPrometheusReloadChan()
	return nil
}

func (i *alarm) CreateOrUpdate(tx *gorm.DB, alarmObj *db.Alarm, req view.ReqAlarmCreate) (err error) {
	// v1 -> v2 disable root conditions field
	req.ConvertV2()
	filtersDB, err := i.FilterCreate(tx, alarmObj, req.Filters)
	if err != nil {
		invoker.Logger.Error("alarm", elog.String("step", "alarm create failed 02"), elog.String("err", err.Error()))
		return
	}
	// create new views
	viewDDLs := db.String2String{}
	alertRules := db.String2String{}
	for filterId, filterItem := range filtersDB {
		var tableInfo db.BaseTable
		// table info
		tableInfo, err = db.TableInfo(tx, filterItem.Tid)
		if err != nil {
			return
		}
		// prometheus set
		var instance db.BaseInstance
		instance, err = db.InstanceInfo(tx, tableInfo.Database.Iid)
		if err != nil {
			return
		}
		var op inquiry.Operator
		op, err = InstanceManager.Load(tableInfo.Database.Iid)
		if err != nil {
			return
		}
		// drop alarm views
		if len(alarmObj.ViewDDLs) > 0 {
			for iidTable := range alarmObj.ViewDDLs {
				ddlOp := op
				table := iidTable
				iidTableArr := strings.Split(iidTable, "|")
				if len(iidTableArr) == 2 {
					table = iidTableArr[1]
					iid, _ := strconv.Atoi(iidTableArr[0])
					ddlOp, err = InstanceManager.Load(iid)
					if err != nil {
						return
					}
					if iid != instance.ID {
						continue
					}
				}
				if err = ddlOp.DeleteAlertView(table, tableInfo.Database.Cluster); err != nil {
					return
				}
			}
		} else {
			if alarmObj.ViewTableName != "" {
				err = op.DeleteAlertView(alarmObj.ViewTableName, tableInfo.Database.Cluster)
				if err != nil {
					invoker.Logger.Error("alarm", elog.String("step", "alarm create failed 05"), elog.String("err", err.Error()))
					return
				}
			}
		}
		// gen view table name & sql
		table, ddl, errAlertViewGen := op.GetAlertViewSQL(alarmObj, tableInfo, filterId, filterItem.When)
		if errAlertViewGen != nil {
			return errAlertViewGen
		}
		// exec view sql
		if err = op.CreateAlertView(table, ddl, tableInfo.Database.Cluster); err != nil {
			return
		}
		viewDDLs[fmt.Sprintf("%d|%s", tableInfo.Database.Iid, table)] = ddl
		// rule store
		r := i.PrometheusRuleGen(alarmObj, filterItem.Exp, filterId)
		ruleName := alarmObj.RuleName(filterId)
		alertRules[fmt.Sprintf("%d|%s", tableInfo.Database.Iid, ruleName)] = r
		if err = i.PrometheusRuleCreateOrUpdate(instance, ruleName, r); err != nil {
			return
		}
		if err = Alarm.PrometheusRuleDelete(&instance, alarmObj); err != nil {
			return
		}
	}
	ups := make(map[string]interface{}, 0)
	ups["alert_rules"] = alertRules
	ups["view_ddl_s"] = viewDDLs
	ups["status"] = db.AlarmStatusRuleCheck
	return db.AlarmUpdate(tx, alarmObj.ID, ups)
}

func (i *alarm) OpenOperator(id int) (err error) {
	alarmInfo, relatedList, err := db.GetAlarmTableInstanceInfo(id)
	if err != nil {
		return
	}
	for _, ri := range relatedList {
		op, errInstanceManager := InstanceManager.Load(ri.Instance.ID)
		if errInstanceManager != nil {
			return errInstanceManager
		}
		if len(alarmInfo.ViewDDLs) > 0 {
			for iidTable, ddl := range alarmInfo.ViewDDLs {
				table := iidTable
				iidTableArr := strings.Split(iidTable, "|")
				if len(iidTableArr) == 2 {
					table = iidTableArr[1]
					iid, _ := strconv.Atoi(iidTableArr[0])
					op, err = InstanceManager.Load(iid)
					if err != nil {
						return
					}
					if iid != ri.Table.Database.Iid {
						continue
					}
				}
				if err = op.CreateAlertView(table, ddl, ri.Table.Database.Cluster); err != nil {
					return
				}
			}
		} else {
			if err = op.CreateAlertView(alarmInfo.ViewTableName, alarmInfo.View, ri.Table.Database.Cluster); err != nil {
				return
			}
		}
		if len(alarmInfo.AlertRules) > 0 {
			for iidRuleName, alertRule := range alarmInfo.AlertRules {
				ruleName := iidRuleName
				iidTableArr := strings.Split(iidRuleName, "|")
				var ins db.BaseInstance
				if len(iidTableArr) == 2 {
					ruleName = iidTableArr[1]
					iid, _ := strconv.Atoi(iidTableArr[0])
					ins, _ = db.InstanceInfo(invoker.Db, iid)
				}
				if err = i.PrometheusRuleCreateOrUpdate(ins, ruleName, alertRule); err != nil {
					invoker.Logger.Error("alarm", elog.String("step", "prometheus rule delete failed"), elog.String("err", err.Error()))
					return
				}
			}
		} else if alarmInfo.Tid > 0 {
			table, _ := db.TableInfo(invoker.Db, alarmInfo.Tid)
			ins, _ := db.InstanceInfo(invoker.Db, table.Database.Iid)
			if err = i.PrometheusRuleCreateOrUpdate(ins, alarmInfo.RuleName(0), alarmInfo.AlertRule); err != nil {
				invoker.Logger.Error("alarm", elog.String("step", "prometheus rule delete failed"), elog.String("err", err.Error()))
				return
			}
		}

	}
	if err = db.AlarmUpdate(invoker.Db, id, map[string]interface{}{"status": db.AlarmStatusRuleCheck}); err != nil {
		return
	}
	return
}

func (i *alarm) Update(uid, alarmId int, req view.ReqAlarmCreate) (err error) {
	if req.Name == "" || req.Interval == 0 || len(req.ChannelIds) == 0 {
		return errors.Wrap(errors.New("error params"), "")
	}
	if len(req.Filters) > 0 {
		req.Mode = req.Filters[0].Mode
	}
	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	ups["name"] = req.Name
	ups["desc"] = req.Desc
	ups["interval"] = req.Interval
	ups["unit"] = req.Unit
	ups["uid"] = uid
	ups["no_data_op"] = req.NoDataOp
	ups["mode"] = req.Mode
	ups["level"] = req.Level
	ups["channel_ids"] = db.Ints(req.ChannelIds)
	tableIds := db.Ints{}
	for _, f := range req.Filters {
		tableIds = append(tableIds, f.Tid)
	}
	ups["table_ids"] = tableIds
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
		return
	}
	return
}

func (i *alarm) AddPrometheusReloadChan() {
	// 10 times
	for k := 0; k < reloadTimes; k++ {
		if len(i.reloadChan) < reloadTimes {
			invoker.Logger.Debug("AllPrometheusReload", elog.String("step", "AddPrometheusReloadChan"), elog.Any("k", k))
			i.reloadChan <- time.Now().Unix()
		}
	}
}

func (i *alarm) IsAllClosed(iid int) (err error) {
	tables, err := db.TableListByInstanceId(invoker.Db, iid)
	tidArr := make([]int, 0)
	for _, table := range tables {
		tidArr = append(tidArr, table.ID)
	}
	// Detect whether there is an alarm in effect.
	conds := egorm.Conds{}
	conds["status"] = egorm.Cond{
		Op:  ">",
		Val: 1,
	}
	alarms, err := db.AlarmListByTidArr(conds, tidArr)
	if err != nil {
		return err
	}
	if len(alarms) == 0 {
		return nil
	}
	errReason := ""
	for _, a := range alarms {
		errReason = fmt.Sprintf("%sid: %d, name: %s ;", errReason, a.ID, a.Name)
	}
	return errors.New("Contains non-closed alarm:" + errReason)
}

func AllPrometheusReload() {
	instances, err := db.InstanceList(egorm.Conds{})
	if err != nil {
		invoker.Logger.Error("AllPrometheusReload", elog.String("step", "InstanceList"), elog.String("error", err.Error()))
		return
	}
	pm := make(map[string]interface{})
	for _, ins := range instances {
		if ins.PrometheusTarget != "" {
			pm[ins.PrometheusTarget] = struct{}{}
		}
	}
	for target := range pm {
		errReload := Alarm.PrometheusReload(target)
		if errReload != nil {
			invoker.Logger.Error("AllPrometheusReload", elog.String("step", "PrometheusReload"), elog.String("error", errReload.Error()))
		}
	}
	return
}

// AlertRuleCheck Detect alarm rules in progress
func AlertRuleCheck() error {
	conds := egorm.Conds{}
	conds["status"] = db.AlarmStatusRuleCheck
	alarms, err := db.AlarmList(conds)
	if err != nil {
		return err
	}
	// Find all instances
	promPool := make(map[int]*alertcomponent.Prometheus)
	for _, alert := range alarms {
		isRuleOk := true
		if len(alert.RuleNameMap()) == 0 && alert.AlertRule == "" {
			isRuleOk = false
		}
		for iid, ruleList := range alert.RuleNameMap() {
			prom, ok := promPool[iid]
			if !ok {
				// Cache once
				ins, _ := db.InstanceInfo(invoker.Db, iid)
				if ins.RuleStoreType == 0 {
					isRuleOk = false
					break
				}
				prom, err = alertcomponent.NewPrometheus(ins.PrometheusTarget)
				if err != nil {
					core.LoggerError("ruleCheck", "prometheus", err)
					isRuleOk = false
					break
				}
				promPool[iid] = prom
			}
			if okIsEffect, errIsEffect := prom.IsRuleTakeEffect(ruleList); errIsEffect != nil {
				core.LoggerError("ruleCheck", "isRuleTakeEffect", errIsEffect)
				isRuleOk = false
				break
			} else if !okIsEffect {
				isRuleOk = false
				break
			}
		}
		if isRuleOk {
			if err = db.AlarmUpdate(invoker.Db, alert.ID, map[string]interface{}{"status": db.AlarmStatusOpen}); err != nil {
				core.LoggerError("ruleCheck", "isRuleTakeEffect", err)
				continue
			}
		}
	}
	return nil
}

func AlarmAttachInfo(respList []*db.Alarm) []view.RespAlarmList {
	res := make([]view.RespAlarmList, 0)
	for _, a := range respList {
		alarmInfo, relatedList, errAlarmInfo := db.GetAlarmTableInstanceInfo(a.ID)
		if errAlarmInfo != nil {
			core.LoggerError("alarm", "attach", errAlarmInfo)
			continue
		}
		if alarmInfo.User == nil || alarmInfo.User.ID == 0 {
			u, _ := db.UserInfo(alarmInfo.Uid)
			alarmInfo.User = &u
		}
		alarmInfo.User.Password = "*"
		var (
			tableInfo    db.BaseTable
			instanceInfo db.BaseInstance
		)
		if len(relatedList) > 0 {
			tableInfo = relatedList[0].Table
			instanceInfo = relatedList[0].Instance
		}
		res = append(res, view.RespAlarmList{
			Alarm:       &alarmInfo,
			RelatedList: relatedList,

			TableName:    tableInfo.Name,
			TableDesc:    tableInfo.Desc,
			Tid:          tableInfo.ID,
			DatabaseName: tableInfo.Database.Name,
			DatabaseDesc: tableInfo.Database.Desc,
			Did:          tableInfo.Did,
			InstanceName: instanceInfo.Name,
			InstanceDesc: instanceInfo.Desc,
			Iid:          instanceInfo.ID,
		})
	}
	return res
}

func aggregationOp(mode int, exp string, expVal string) string {
	switch mode {
	case db.AlarmModeAggregation:
		return fmt.Sprintf("%s and %s!=-1", exp, expVal)
	default:
		return exp
	}
}

func noDataOp(op int, exp, expVal string) string {
	switch op {
	case NoDataOpDefault:
		return exp
	case NoDataOpOK:
		return fmt.Sprintf("(%s) or absent(%s)!=1", exp, expVal)
	case NoDataOpAlert:
		return fmt.Sprintf("(%s) or absent(%s)==1", exp, expVal)
	default:
		return exp
	}
}

func alarmRuleDelete(instance *db.BaseInstance, ruleName string) (err error) {
	rc, err := rule.GetComponent(instance.RuleStoreType, &rule.Params{
		InstanceID: instance.ID,
		RulePath:   instance.FilePath,
		ClusterId:  instance.ClusterId,
		Namespace:  instance.Namespace,
		Configmap:  instance.Configmap,
	})
	if err != nil {
		return err
	}
	return rc.Delete(ruleName)
}
