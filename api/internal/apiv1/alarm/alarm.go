package alarm

import (
	"strconv"

	"github.com/google/uuid"
	"github.com/gotomicro/ego-component/egorm"
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
		Tid:        tid,
		Uuid:       uuid.NewString(),
		Name:       req.Name,
		Desc:       req.Desc,
		Interval:   req.Interval,
		Unit:       req.Unit,
		Tags:       req.Tags,
		ChannelIds: db.Ints(req.ChannelIds),
		Uid:        c.Uid(),
	}
	err := db.AlarmCreate(tx, obj)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "alarm create failed 01: "+err.Error(), nil)
		return
	}
	err = service.Alarm.CreateOrUpdate(tx, obj, req)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "alarm create failed 02: "+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "alarm create failed 03: "+err.Error(), nil)
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
	ups["channel_ids"] = db.Ints(req.ChannelIds)
	if err := db.AlarmUpdate(tx, id, ups); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed 01: "+err.Error(), nil)
		return
	}
	// filter
	if err := db.AlarmFilterDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed 02: "+err.Error(), nil)
		return
	}
	// condition
	if err := db.AlarmConditionDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed 03: "+err.Error(), nil)
		return
	}
	obj, err := db.AlarmInfo(tx, id)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed 04: "+err.Error(), nil)
		return
	}
	if err = service.Alarm.CreateOrUpdate(tx, &obj, req); err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed 05:"+err.Error(), nil)
		return
	}
	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "update failed 06:"+err.Error(), nil)
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
	user, _ := db.UserInfo(alarmInfo.Uid)
	res := view.ReqAlarmInfo{
		Alarm:      alarmInfo,
		Filters:    filters,
		Conditions: conditions,
		User:       user,
	}
	res.Password = "*"
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

func HistoryList(c *core.Context) {
	var req view.ReqAlarmHistoryList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	conds := egorm.Conds{}
	if req.AlarmId != 0 {
		conds["alarm_id"] = req.AlarmId
	}
	if req.StartTime != 0 {
		conds["ctime"] = egorm.Cond{Op: ">", Val: req.StartTime}
	}
	if req.EndTime != 0 {
		conds["ctime"] = egorm.Cond{Op: "<", Val: req.EndTime}
	}
	total, list := db.AlarmHistoryPage(conds, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	conds["is_pushed"] = 1
	succ, _ := db.AlarmHistoryPage(conds, &db.ReqPage{
		Current:  req.Current,
		PageSize: req.PageSize,
	})
	c.JSONPage(view.RespAlarmHistoryList{
		Total: total,
		Succ:  succ,
		List:  list,
	}, core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}

func HistoryInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db.AlarmHistoryInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
