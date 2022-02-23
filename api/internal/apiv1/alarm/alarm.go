package alarm

import (
	"strconv"

	"github.com/google/uuid"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service"
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
	for _, condition := range req.Conditions {
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
	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "create failed: "+err.Error(), nil)
		return
	}
	c.JSONOK()
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
