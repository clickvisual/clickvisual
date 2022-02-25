package alarm

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/internal/service/inquiry"
	"github.com/shimohq/mogo/api/internal/service/kube"
	"github.com/shimohq/mogo/api/internal/service/kube/resource"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func Create(c *core.Context) {
	var req view.ReqAlarmCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	var tid int
	for _, f := range req.Filters {
		if f.SetOperatorTyp == 0 {
			if tid != 0 {
				c.JSONE(1, "invalid parameter: only one default table allowed", nil)
				return
			}
			tid = f.Tid
		}
	}
	tx := invoker.Db.Begin()
	obj := &db.Alarm{
		Tid:      tid,
		Uuid:     uuid.NewString(),
		Name:     req.Name,
		Desc:     req.Desc,
		Interval: req.Interval,
		Unit:     req.Unit,
		Tags:     req.Tags,
		Uid:      c.Uid(),
	}
	err := db.AlarmCreate(tx, obj)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	var filtersDB []*db.AlarmFilter
	for _, filter := range req.Filters {
		filterObj := &db.AlarmFilter{
			AlarmId:        obj.ID,
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
			tx.Rollback()
			c.JSONE(1, "create failed: "+err.Error(), nil)
			return
		}
		filtersDB = append(filtersDB, filterObj)
	}

	expVal := fmt.Sprintf("%s{%s}", obj.Name, inquiry.TagsToString(obj, false))
	sort.Slice(req.Conditions, func(i, j int) bool {
		return req.Conditions[i].SetOperatorTyp < req.Conditions[j].SetOperatorTyp
	})
	var exp string
	for _, condition := range req.Conditions {
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
				tx.Rollback()
				c.JSONE(1, "conditions error: ", nil)
				return
			}
			exp = fmt.Sprintf("%s and %s", exp, innerCond)
		case 2:
			if exp == "" {
				tx.Rollback()
				c.JSONE(1, "conditions error: ", nil)
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
			tx.Rollback()
			c.JSONE(1, "create failed: "+err.Error(), nil)
			return
		}
	}
	// table info
	tableInfo, err := db.TableInfo(invoker.Db, tid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	// alarm setting
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	// view set
	viewName, viewSQL, err := op.AlertViewCreate(obj, filtersDB)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	elog.Debug("alarm", elog.String("view", viewName), elog.String("viewSQL", viewSQL))
	ups := make(map[string]interface{}, 0)
	ups["view"] = viewSQL
	err = db.AlarmUpdate(tx, obj.ID, ups)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	// prometheus set
	instance, err := db.InstanceInfo(tx, tableInfo.Database.Iid)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "You need to configure alarms related to the instance first", nil)
		return
	}
	elog.Debug("alert", elog.Any("instance", instance))
	client, err := kube.ClusterManager.GetClusterManager(instance.ClusterId)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "cluster data acquisition failed: "+err.Error(), nil)
		return
	}
	rule := make(map[string]string)
	// exp: up{instance="localhost:9090", job="prometheus"} > 0

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
	rule[obj.AlertRuleName()] = fmt.Sprintf(template, obj.Name, exp, obj.AlertInterval())

	elog.Debug("alert", elog.Any("rule", rule))

	err = resource.ConfigmapCreateOrUpdate(client, instance.Namespace, instance.Configmap, rule)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "configMap update failed", nil)
		return
	}
	time.Sleep(time.Second)
	elog.Debug("alert", elog.Any("reload", instance.PrometheusTarget+"/-/reload"))
	resp, err := http.Post(instance.PrometheusTarget+"/-/reload", "application/json", nil)
	if err != nil {
		tx.Rollback()
		c.JSONE(core.CodeErr, "configMap update failed", nil)
		return
	}
	defer resp.Body.Close()

	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
	return
}

func Update(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqAlarmCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	tx := invoker.Db.Begin()
	ups := make(map[string]interface{}, 0)
	ups["name"] = req.Name
	ups["desc"] = req.Desc
	ups["interval"] = req.Interval
	ups["unit"] = req.Unit
	ups["uid"] = c.Uid()
	if err := db.AlarmUpdate(tx, id, ups); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	// filter
	if err := db.AlarmFilterDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	for _, filter := range req.Filters {
		filterObj := &db.AlarmFilter{
			AlarmId:        id,
			When:           filter.When,
			SetOperatorTyp: filter.SetOperatorTyp,
			SetOperatorExp: filter.SetOperatorExp,
		}
		if err := db.AlarmFilterCreate(tx, filterObj); err != nil {
			tx.Rollback()
			c.JSONE(1, "create failed: "+err.Error(), nil)
			return
		}
	}
	// condition
	if err := db.AlarmConditionDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	for _, condition := range req.Conditions {
		conditionObj := &db.AlarmCondition{
			AlarmId:        id,
			SetOperatorTyp: condition.SetOperatorTyp,
			SetOperatorExp: condition.SetOperatorExp,
			Cond:           condition.Cond,
			Val1:           condition.Val1,
			Val2:           condition.Val2,
		}
		if err := db.AlarmConditionCreate(tx, conditionObj); err != nil {
			tx.Rollback()
			c.JSONE(1, "create failed: "+err.Error(), nil)
			return
		}
	}
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func List(c *core.Context) {
	req := &db.ReqPage{}
	if err := c.Bind(req); err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	name := c.Query("name")
	tid, _ := strconv.Atoi(c.Query("tid"))
	did, _ := strconv.Atoi(c.Query("did"))
	query := egorm.Conds{}
	if name != "" {
		query["name"] = egorm.Cond{
			Op:  "like",
			Val: name,
		}
	}
	if tid != 0 {
		query["tid"] = tid
	}
	if did != 0 {
		query["mogo_base_table.did"] = did
		total, list := db.AlarmListByDidPage(query, req)
		c.JSONPage(list, core.Pagination{
			Current:  req.Current,
			PageSize: req.PageSize,
			Total:    total,
		})
		return
	}
	total, list := db.AlarmListPage(query, req)
	c.JSONPage(list, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}

func Info(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	alarmInfo, err := db.AlarmInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	conds["alarm_id"] = alarmInfo.ID
	filters, err := db.AlarmFilterList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	conditions, err := db.AlarmConditionList(conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	res := view.ReqAlarmInfo{
		Alarm:      alarmInfo,
		Filters:    filters,
		Conditions: conditions,
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}

func Delete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	tx := invoker.Db.Begin()
	if err := db.AlarmDelete(tx, id); err != nil {
		c.JSONE(1, "failed to delete: "+err.Error(), nil)
		return
	}
	// filter
	if err := db.AlarmFilterDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	// condition
	if err := db.AlarmConditionDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed: "+err.Error(), nil)
		return
	}
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
}
