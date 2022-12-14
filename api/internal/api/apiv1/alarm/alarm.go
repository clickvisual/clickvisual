package alarm

import (
	"strconv"
	"strings"

	"github.com/ego-component/egorm"
	"github.com/google/uuid"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// Create
// @Tags         ALARM
// @Summary	     告警创建
func Create(c *core.Context) {
	var req view.ReqAlarmCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	for _, f := range req.Filters {
		tableInfo, err := db.TableInfo(invoker.Db, f.Tid)
		if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  pmsplugin.PrefixInstance,
			ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
			SubResource: pmsplugin.Alarm,
			Acts:        []string{pmsplugin.ActEdit},
			DomainType:  pmsplugin.PrefixTable,
			DomainId:    strconv.Itoa(tableInfo.ID),
		}); err != nil {
			c.JSONE(1, "CheckNormalPermission", err)
			return
		}
	}
	tx := invoker.Db.Begin()
	tableIds := db.Ints{}
	for _, f := range req.Filters {
		tableIds = append(tableIds, f.Tid)
	}

	obj := &db.Alarm{
		Uuid:       uuid.NewString(),
		Name:       req.Name,
		Service:    req.Service,
		Mobiles:    req.Mobiles,
		Desc:       req.Desc,
		Interval:   req.Interval,
		Unit:       req.Unit,
		Tags:       req.Tags,
		NoDataOp:   req.NoDataOp,
		ChannelIds: db.Ints(req.ChannelIds),
		Uid:        c.Uid(),
		Level:      req.Level,
		TableIds:   tableIds,
	}
	if err := db.AlarmCreate(tx, obj); err != nil {
		tx.Rollback()
		c.JSONE(1, "alarm create failed 01", err)
		return
	}
	err := service.Alert.CreateOrUpdate(tx, obj, req)
	if err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), err)
		return
	}
	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSONE(1, "alarm create failed 03", err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsCreate, map[string]interface{}{"obj": obj})
	c.JSONOK()
	return
}

// Update
// @Tags         ALARM
// @Summary 	 告警更新
func Update(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	var req view.ReqAlarmCreate
	err := c.Bind(&req)
	if err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	alarmInfo, relatedList, errAlarmInfo := db.GetAlarmTableInstanceInfo(id)
	if errAlarmInfo != nil {
		c.JSONE(1, "alarm info not found", errAlarmInfo)
		return
	}
	for _, ri := range relatedList {
		if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  pmsplugin.PrefixInstance,
			ObjectIdx:   strconv.Itoa(ri.Table.Database.Iid),
			SubResource: pmsplugin.Alarm,
			Acts:        []string{pmsplugin.ActEdit},
			DomainType:  pmsplugin.PrefixTable,
			DomainId:    strconv.Itoa(ri.Table.ID),
		}); err != nil {
			c.JSONE(1, "permission verification failed", err)
			return
		}
	}
	switch req.Status {
	case db.AlarmStatusOpen:
		err = service.Alert.OpenOperator(id)
	case db.AlarmStatusClose:
		clusterRuleGroups := map[string]db.ClusterRuleGroup{}
		for _, ri := range relatedList {
			op, errInstanceManager := service.InstanceManager.Load(ri.Instance.ID)
			if errInstanceManager != nil {
				c.JSONE(core.CodeErr, errInstanceManager.Error(), errInstanceManager)
				return
			}
			if len(alarmInfo.ViewDDLs) > 0 {
				for iidTable := range alarmInfo.ViewDDLs {
					table := iidTable
					iidTableArr := strings.Split(iidTable, "|")
					if len(iidTableArr) == 2 {
						table = iidTableArr[1]
						iid, _ := strconv.Atoi(iidTableArr[0])
						if iid != ri.Table.Database.Iid {
							continue
						}
						op, err = service.InstanceManager.Load(iid)
						if err != nil {
							c.JSONE(core.CodeErr, "clickhouse load failed", err)
							return
						}
					}
					if err = op.DeleteAlertView(table, ri.Table.Database.Cluster); err != nil {
						c.JSONE(core.CodeErr, "alert view drop", err)
						return
					}
				}
			} else {
				if err = op.DeleteAlertView(alarmInfo.ViewTableName, ri.Table.Database.Cluster); err != nil {
					c.JSONE(core.CodeErr, "alarm update failed when delete metrics view", err)
					return
				}
			}
			instance := ri.Instance
			if instance.RuleStoreType == db.RuleStoreTypeK8sOperator {
				clusterRuleGroup := db.ClusterRuleGroup{}
				if tmp, ok := clusterRuleGroups[instance.GetRuleStoreKey()]; ok {
					clusterRuleGroup = tmp
				} else {
					clusterRuleGroup.ClusterId = instance.ClusterId
					clusterRuleGroup.Instance = instance
					clusterRuleGroup.GroupName = alarmInfo.GetGroupName(instance.ID)
				}
				clusterRuleGroups[instance.GetRuleStoreKey()] = clusterRuleGroup
			} else if instance.RuleStoreType == db.RuleStoreTypeFile || instance.RuleStoreType == db.RuleStoreTypeK8sConfigMap {
				if err = service.Alert.DeletePrometheusRule(&ri.Instance, &alarmInfo); err != nil {
					c.JSONE(core.CodeErr, "prometheus rule delete failed:"+err.Error(), err)
					return
				}
			}
		}
		if len(clusterRuleGroups) > 0 {
			_ = service.Alert.PrometheusRuleBatchRemove(clusterRuleGroups)
		}
		_ = db.AlarmFilterUpdateStatus(invoker.Db, id, map[string]interface{}{"status": db.AlarmStatusClose})
		err = db.AlarmUpdate(invoker.Db, id, map[string]interface{}{"status": db.AlarmStatusClose})
	default:
		err = service.Alert.Update(c.Uid(), id, req)
	}
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsUpdate, map[string]interface{}{"req": req})
	c.JSONOK()
}

// List
// @Tags         ALARM
// @Summary	     告警列表
func List(c *core.Context) {
	req := &db.ReqPage{}
	if err := c.Bind(req); err != nil {
		c.JSONE(1, "invalid parameter", err)
		return
	}
	name := c.Query("name")
	iid, _ := strconv.Atoi(c.Query("iid"))
	tid, _ := strconv.Atoi(c.Query("tid"))
	did, _ := strconv.Atoi(c.Query("did"))
	alarmId, _ := strconv.Atoi(c.Query("alarmId"))
	status, _ := strconv.Atoi(c.Query("status"))
	query := egorm.Conds{}
	if name != "" {
		query["name"] = egorm.Cond{
			Op:  "like",
			Val: name,
		}
	}
	if status != 0 {
		query["status"] = status
	}
	if name == "" && iid == 0 && tid == 0 && did == 0 && status == 0 && alarmId != 0 {
		query["id"] = alarmId
	}
	var (
		total int64
		list  []*db.Alarm
	)
	if tid != 0 {
		table, _ := db.TableInfo(invoker.Db, tid)
		if !service.TableViewIsPermission(c.Uid(), table.Database.Iid, tid) {
			c.JSONE(1, "", constx.ErrPmsCheck)
			return
		}
		total, list = db.AlarmListPageByTidArr(query, req, []int{tid})
	} else if did != 0 {
		database, _ := db.DatabaseInfo(invoker.Db, did)
		if !service.DatabaseViewIsPermission(c.Uid(), database.Iid, did) {
			c.JSONE(1, "", constx.ErrPmsCheck)
			return
		}
		// (replace(replace(JSON_EXTRACT(`cv_alarm`.`table_ids`, '$[*]'),'[',''),']',''))
		query[db.TableNameBaseTable+".did"] = did
		total, list = db.AlarmListByDidPage(query, req)
	} else if iid != 0 {
		if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  pmsplugin.PrefixInstance,
			ObjectIdx:   strconv.Itoa(iid),
			SubResource: pmsplugin.Alarm,
			Acts:        []string{pmsplugin.ActView},
		}); err != nil {
			c.JSONE(1, "permission verification failed", err)
			return
		}
		conds := egorm.Conds{}
		if iid != 0 {
			conds["iid"] = iid
		}
		ds, _ := db.DatabaseList(invoker.Db, conds)
		for _, d := range ds {
			query[db.TableNameBaseTable+".did"] = d.ID
			totalTmp, listTmp := db.AlarmListByDidPage(query, req)
			list = append(list, listTmp...)
			total += totalTmp
		}
	} else {
		var tidArr = make([]int, 0)
		// Check whether you are an administrator.
		err := permission.Manager.IsRootUser(c.Uid())
		if err != nil {
			// If you are not an administrator, get a list of instances that have permission
			tidArr = service.ReadAllPermissionTable(c.Uid())
		}
		// SELECT *  FROM `cv_alarm` WHERE JSON_CONTAINS(`table_ids`, '[1]') OR JSON_CONTAINS(`table_ids`, '[7]')
		total, list = db.AlarmListPageByTidArr(query, req, tidArr)
	}
	c.JSONPage(service.AlarmAttachInfo(list), core.Pagination{
		Current:  req.Current,
		PageSize: req.PageSize,
		Total:    total,
	})
	return
}

// Info
// @Tags         ALARM
// @Summary	     告警详情
func Info(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	alarmInfo, relatedList, err := db.GetAlarmTableInstanceInfo(id)
	if err != nil {
		c.JSONE(core.CodeErr, "alarm info load failed", err)
		return
	}
	for _, ri := range relatedList {
		if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  pmsplugin.PrefixInstance,
			ObjectIdx:   strconv.Itoa(ri.Table.Database.Iid),
			SubResource: pmsplugin.Alarm,
			Acts:        []string{pmsplugin.ActView},
			DomainType:  pmsplugin.PrefixTable,
			DomainId:    strconv.Itoa(ri.Table.ID),
		}); err != nil {
			c.JSONE(1, "permission verification failed", err)
			return
		}
	}
	conds := egorm.Conds{}
	conds["alarm_id"] = alarmInfo.ID
	filters, err := db.AlarmFilterList(invoker.Db, conds)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	respAlarmFilters := make([]view.RespAlarmInfoFilter, 0)
	for _, filter := range filters {
		conditionConds := egorm.Conds{}
		conditionConds["alarm_id"] = alarmInfo.ID
		if len(filters) != 1 {
			conditionConds["filter_id"] = filter.ID
		}
		conditions, _ := db.AlarmConditionList(conditionConds)
		filterTableInfo, _ := db.TableInfo(invoker.Db, filter.Tid)
		respAlarmFilters = append(respAlarmFilters, view.RespAlarmInfoFilter{
			AlarmFilter: filter,
			TableName:   filterTableInfo.Name,
			Conditions:  conditions,
		})
	}
	user, _ := db.UserInfo(alarmInfo.Uid)

	var (
		tableInfo    db.BaseTable
		instanceInfo db.BaseInstance
	)
	if len(relatedList) > 0 {
		tableInfo = relatedList[0].Table
		instanceInfo = relatedList[0].Instance
	}
	instanceInfo.Dsn = "*"
	user.Password = "*"

	res := view.RespAlarmInfo{
		Alarm:       alarmInfo,
		Filters:     respAlarmFilters,
		User:        user,
		Ctime:       alarmInfo.Ctime,
		Utime:       alarmInfo.Utime,
		RelatedList: relatedList,

		Instance: instanceInfo,
		Table:    tableInfo,
	}
	res.Tid = res.Table.ID
	c.JSONOK(res)
	return
}

// Delete
// @Tags         ALARM
// @Summary	     告警删除
func Delete(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	alarmInfo, relatedList, err := db.GetAlarmTableInstanceInfo(id)
	if err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	for _, ri := range relatedList {
		if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
			UserId:      c.Uid(),
			ObjectType:  pmsplugin.PrefixInstance,
			ObjectIdx:   strconv.Itoa(ri.Table.Database.Iid),
			SubResource: pmsplugin.Alarm,
			Acts:        []string{pmsplugin.ActDelete},
			DomainType:  pmsplugin.PrefixTable,
			DomainId:    strconv.Itoa(ri.Table.ID),
		}); err != nil {
			c.JSONE(1, "permission verification failed", err)
			return
		}
	}
	tx := invoker.Db.Begin()
	if err = db.AlarmDelete(tx, id); err != nil {
		c.JSONE(1, err.Error(), err)
		return
	}
	// filter
	if err = db.AlarmFilterDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), err)
		return
	}
	// condition
	if err = db.AlarmConditionDeleteBatch(tx, id); err != nil {
		tx.Rollback()
		c.JSONE(1, err.Error(), err)
		return
	}
	clusterRuleGroups := map[string]db.ClusterRuleGroup{}
	for _, ri := range relatedList {
		instance := ri.Instance
		if instance.RuleStoreType == db.RuleStoreTypeK8sOperator {
			clusterRuleGroup := db.ClusterRuleGroup{}
			if tmp, ok := clusterRuleGroups[instance.GetRuleStoreKey()]; ok {
				clusterRuleGroup = tmp
			} else {
				clusterRuleGroup.ClusterId = instance.ClusterId
				clusterRuleGroup.Instance = instance
				clusterRuleGroup.GroupName = alarmInfo.GetGroupName(instance.ID)
			}
			clusterRuleGroups[instance.GetRuleStoreKey()] = clusterRuleGroup
		} else if instance.RuleStoreType == db.RuleStoreTypeFile || instance.RuleStoreType == db.RuleStoreTypeK8sConfigMap {
			_ = service.Alert.DeletePrometheusRule(&ri.Instance, &alarmInfo)
		}
		var op inquiry.Operator
		op, err = service.InstanceManager.Load(ri.Table.Database.Iid)
		if err != nil {
			tx.Rollback()
			c.JSONE(core.CodeErr, err.Error(), err)
			return
		}
		if len(alarmInfo.ViewDDLs) > 0 {
			for iidTable := range alarmInfo.ViewDDLs {
				table := iidTable
				iidTableArr := strings.Split(iidTable, "|")
				if len(iidTableArr) == 2 {
					table = iidTableArr[1]
					iid, _ := strconv.Atoi(iidTableArr[0])
					op, err = service.InstanceManager.Load(iid)
					if err != nil {
						tx.Rollback()
						c.JSONE(core.CodeErr, err.Error(), err)
						return
					}
					if iid != ri.Table.Database.Iid {
						continue
					}
				}
				if err = op.DeleteAlertView(table, ri.Table.Database.Cluster); err != nil {
					tx.Rollback()
					c.JSONE(core.CodeErr, err.Error(), err)
					return
				}
			}
		} else {
			if err = op.DeleteAlertView(alarmInfo.ViewTableName, ri.Table.Database.Cluster); err != nil {
				tx.Rollback()
				c.JSONE(core.CodeErr, err.Error(), err)
				return
			}
		}
	}
	if len(clusterRuleGroups) > 0 {
		_ = service.Alert.PrometheusRuleBatchRemove(clusterRuleGroups)
	}
	if err = tx.Commit().Error; err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	event.Event.AlarmCMDB(c.User(), db.OpnAlarmsDelete, map[string]interface{}{"alarmInfo": alarmInfo})
	c.JSONOK()
}

// HistoryList
// @Tags         ALARM
// @Summary	     告警推送记录
func HistoryList(c *core.Context) {
	var req view.ReqAlarmHistoryList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), err)
		return
	}
	elog.Debug("history", elog.Any("req", req))
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

// HistoryInfo
// @Tags         ALARM
// @Summary	     告警推送详情
func HistoryInfo(c *core.Context) {
	id := cast.ToInt(c.Param("id"))
	if id == 0 {
		c.JSONE(1, "invalid parameter", nil)
		return
	}
	res, err := db.AlarmHistoryInfo(invoker.Db, id)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(res)
	return
}
