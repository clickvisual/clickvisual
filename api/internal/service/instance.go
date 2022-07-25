package service

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/ClickHouse/clickhouse-go"
	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type instanceManager struct {
	dss sync.Map // datasource list
}

func NewInstanceManager() *instanceManager {
	m := &instanceManager{
		dss: sync.Map{},
	}
	datasourceList, _ := db.InstanceList(egorm.Conds{})
	for _, ds := range datasourceList {
		switch ds.Datasource {
		case db.DatasourceMySQL:
			// TODO Not supported at this time
		case db.DatasourceClickHouse:
			// Test connection, storage
			chDb, err := ClickHouseLink(ds.Dsn)
			if err != nil {
				invoker.Logger.Error("ClickHouse", elog.Any("step", "ClickHouseLink"), elog.Any("error", err.Error()))
				continue
			}
			m.dss.Store(ds.DsKey(), inquiry.NewClickHouse(chDb, ds))
		}
	}
	return m
}

func (i *instanceManager) Delete(key string) {
	i.dss.Delete(key)
	return
}

func (i *instanceManager) Add(obj *db.BaseInstance) error {
	switch obj.Datasource {
	case db.DatasourceClickHouse:
		// Test connection, storage
		chDb, err := ClickHouseLink(obj.Dsn)
		if err != nil {
			invoker.Logger.Error("ClickHouse", elog.Any("step", "ClickHouseLink"), elog.Any("error", err.Error()))
			return err
		}
		i.dss.Store(obj.DsKey(), inquiry.NewClickHouse(chDb, obj))
	}
	return nil
}

func (i *instanceManager) Load(id int) (inquiry.Operator, error) {
	instance, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		invoker.Logger.Error("instanceManager", elog.Any("id", id), elog.Any("error", err.Error()))
		return nil, err
	}
	obj, ok := i.dss.Load(db.InstanceKey(id))
	if !ok {
		// try again
		if err = i.Add(&instance); err != nil {
			return nil, constx.ErrInstanceObj
		}
		obj, _ = i.dss.Load(db.InstanceKey(id))
	}
	if obj == nil {
		return nil, constx.ErrInstanceObj
	}
	switch instance.Datasource {
	case db.DatasourceClickHouse:
		return obj.(*inquiry.ClickHouse), nil
	}
	return nil, constx.ErrInstanceObj
}

func (i *instanceManager) All() []inquiry.Operator {
	res := make([]inquiry.Operator, 0)
	i.dss.Range(func(key, obj interface{}) bool {
		iid, _ := strconv.Atoi(key.(string))
		instance, _ := db.InstanceInfo(invoker.Db, iid)
		if instance.Datasource == db.DatasourceClickHouse {
			res = append(res, obj.(*inquiry.ClickHouse))
		}
		return true
	})
	return res
}

func ReadAllPermissionTable(uid int, subResource string) []int {
	tables, _ := db.TableList(invoker.Db, egorm.Conds{})
	resArr := make([]int, 0)
	for _, table := range tables {
		if !TableIsPermission(uid, table.Database.Iid, table.ID, subResource) {
			invoker.Logger.Error("ReadAllPermissionTable",
				elog.Any("uid", uid),
				elog.Any("iid", table.Database.Iid),
				elog.Any("tid", table.ID),
				elog.Any("subResource", subResource))
			continue
		}
		resArr = append(resArr, table.ID)
	}
	return resArr
}

func ReadAllPermissionInstance(uid int, subResource string) ([]int, string) {
	ins, _ := db.InstanceList(egorm.Conds{})
	resArr := make([]int, 0)
	var resStr string
	for _, instance := range ins {
		if !IsPermissionInstance(uid, instance.ID, subResource) {
			invoker.Logger.Error("ReadAllPermissionInstance",
				elog.Any("uid", uid),
				elog.Any("iid", instance.ID),
				elog.Any("subResource", subResource))
			continue
		}
		resArr = append(resArr, instance.ID)
		if resStr == "" {
			resStr = strconv.Itoa(instance.ID)
		} else {
			resStr = fmt.Sprintf("%s,%s", resStr, strconv.Itoa(instance.ID))
		}
	}
	return resArr, resStr
}

func IsPermissionInstance(uid int, iid int, subResource string) bool {
	// check instance permission
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      uid,
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: subResource,
		Acts:        []string{pmsplugin.ActView},
	}); err == nil {
		invoker.Logger.Debug("ReadAllPermissionInstance",
			elog.Any("uid", uid),
			elog.Any("step", "IsPermissionInstance"),
			elog.Any("iid", iid),
			elog.Any("subResource", subResource))
		return true
	}
	// check databases permission
	conds := egorm.Conds{}
	conds["iid"] = iid
	databases, err := db.DatabaseList(invoker.Db, conds)
	if err != nil {
		invoker.Logger.Error("PmsCheckInstanceRead", elog.String("error", err.Error()))
		return false
	}
	for _, d := range databases {
		if IsPermissionDatabase(uid, iid, d.ID, subResource) {
			return true
		}
	}
	return false
}

func IsPermissionDatabase(uid, iid, did int, subResource string) bool {
	// check database permission
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      uid,
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: subResource,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixDatabase,
		DomainId:    strconv.Itoa(did),
	}); err == nil {
		invoker.Logger.Debug("ReadAllPermissionInstance",
			elog.Any("uid", uid),
			elog.Any("step", "IsPermissionDatabase"),
			elog.Any("iid", iid),
			elog.Any("did", did),
			elog.Any("subResource", subResource))
		return true
	}
	// check databases permission
	conds := egorm.Conds{}
	conds["did"] = did
	tables, err := db.TableList(invoker.Db, conds)
	if err != nil {
		invoker.Logger.Error("PmsCheckInstanceRead", elog.String("error", err.Error()))
		return false
	}
	for _, t := range tables {
		if TableIsPermission(uid, iid, t.ID, subResource) {
			return true
		}
	}
	return false
}

func ClickHouseLink(dsn string) (db *sql.DB, err error) {
	if strings.Contains(dsn, "?") && !strings.Contains(dsn, "max_execution_time=") {
		dsn = dsn + "&max_execution_time=60"
	}
	db, err = sql.Open("clickhouse", dsn)
	if err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "sql.error"), elog.String("error", err.Error()))
		return
	}
	if err = db.Ping(); err != nil {
		if exception, ok := err.(*clickhouse.Exception); ok {
			invoker.Logger.Error("ClickHouse", elog.String("step", "exception"), elog.Any("Code", exception.Code), elog.Any("Message", exception.Message), elog.Any("StackTrace", exception.StackTrace))
		} else {
			invoker.Logger.Error("ClickHouse", elog.String("step", "notException"), elog.Any("error", err.Error()))
		}
		return
	}
	db.SetMaxIdleConns(100)
	db.SetMaxOpenConns(50)
	return
}

func InstanceCreate(req view.ReqCreateInstance) (obj db.BaseInstance, err error) {
	conds := egorm.Conds{}
	conds["datasource"] = req.Datasource
	conds["name"] = req.Name
	checks, err := db.InstanceList(conds)
	if err != nil {
		err = errors.Wrap(err, "create DB failed 01: ")
		return
	}
	invoker.Logger.Debug("InstanceCreate", elog.Any("checks", checks))
	if len(checks) > 0 {
		err = errors.New("data source configuration with duplicate name")
		return
	}
	if req.Mode == inquiry.ModeCluster && len(req.Clusters) == 0 {
		err = errors.New("you need to fill in the cluster information")
		return
	}
	obj = db.BaseInstance{
		Datasource:       req.Datasource,
		Name:             req.Name,
		Dsn:              strings.TrimSpace(req.Dsn),
		RuleStoreType:    req.RuleStoreType,
		FilePath:         req.FilePath,
		Desc:             req.Desc,
		ClusterId:        req.ClusterId,
		Namespace:        req.Namespace,
		Configmap:        req.Configmap,
		PrometheusTarget: req.PrometheusTarget,
		ReplicaStatus:    req.ReplicaStatus,
		Mode:             req.Mode,
		Clusters:         req.Clusters,
	}
	invoker.Logger.Debug("instanceCreate", elog.Any("obj", obj))
	if req.PrometheusTarget != "" {
		if err = Alarm.PrometheusReload(req.PrometheusTarget); err != nil {
			err = errors.Wrap(err, "create DB failed 02:")
			return
		}
	}
	tx := invoker.Db.Begin()
	if err = db.InstanceCreate(tx, &obj); err != nil {
		tx.Rollback()
		err = errors.Wrap(err, "create DB failed 03: ")
		return
	}
	if err = InstanceManager.Add(&obj); err != nil {
		tx.Rollback()
		err = errors.Wrap(err, "DNS configuration exception, database connection failure 01: ")
		return
	}
	if err = tx.Commit().Error; err != nil {
		err = errors.Wrap(err, "DNS configuration exception, database connection failure 02: ")
		return
	}
	return obj, nil
}

func DatabaseCreate(req db.BaseDatabase) (out db.BaseDatabase, err error) {
	op, err := InstanceManager.Load(req.Iid)
	if err != nil {
		return
	}
	tx := invoker.Db.Begin()
	if err = db.DatabaseCreate(tx, &req); err != nil {
		err = errors.Wrap(err, "create failed 01:")
		return
	}
	err = op.DatabaseCreate(req.Name, req.Cluster)
	if err != nil {
		tx.Rollback()
		err = errors.Wrap(err, "create failed 02: ")
		return
	}
	if err = tx.Commit().Error; err != nil {
		tx.Rollback()
		err = errors.Wrap(err, "create failed 03: ")
		return
	}
	return req, nil
}

func TableCreate(uid int, databaseInfo db.BaseDatabase, param view.ReqTableCreate) (tableInfo db.BaseTable, err error) {
	op, err := InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		return
	}
	s, d, v, a, err := op.TableCreate(databaseInfo.ID, databaseInfo, param)
	if err != nil {
		err = errors.Wrap(err, "create failed 01:")
		return
	}
	tableInfo = db.BaseTable{
		Did:            databaseInfo.ID,
		Name:           param.TableName,
		Typ:            param.Typ,
		Days:           param.Days,
		Brokers:        param.Brokers,
		Topic:          param.Topics,
		Desc:           param.Desc,
		SqlData:        d,
		SqlStream:      s,
		SqlView:        v,
		SqlDistributed: a,
		TimeField:      db.TimeFieldSecond,
		CreateType:     inquiry.TableCreateTypeCV,
		Uid:            uid,
	}
	err = db.TableCreate(invoker.Db, &tableInfo)
	if err != nil {
		err = errors.Wrap(err, "create failed 02:")
		return
	}
	return tableInfo, nil
}

func AnalysisFieldsUpdate(tid int, data []view.IndexItem) (err error) {
	var (
		addMap map[string]*db.BaseIndex
		delMap map[string]*db.BaseIndex
		newMap map[string]*db.BaseIndex
	)
	// check repeat
	repeatMap := make(map[string]interface{})
	for _, r := range data {
		if r.Typ == 3 {
			err = errors.New("param error: json type 3 should not in params:" + r.Field)
			return
		}
		key := r.Field
		if r.RootName != "" {
			key = r.RootName + "." + r.Field
		}
		if _, ok := repeatMap[key]; ok {
			err = errors.New("param error: repeat index field name:" + r.Field)
			return
		}
		repeatMap[key] = struct{}{}
	}
	req := view.ReqCreateIndex{
		Tid:  tid,
		Data: data,
	}
	req.Tid = tid
	addMap, delMap, newMap, err = Index.Diff(req)
	if err != nil {
		return
	}
	invoker.Logger.Debug("IndexUpdate", elog.Any("addMap", addMap), elog.Any("delMap", delMap))
	err = Index.Sync(req, addMap, delMap, newMap)
	if err != nil {
		return
	}
	return nil
}

func InstanceFilterPms(uid int, sr string) (res []view.RespInstanceSimple, err error) {
	dArr, err := DatabaseListFilterPms(uid, sr)
	if err != nil {
		return
	}
	res = make([]view.RespInstanceSimple, 0)
	iMap := make(map[int]view.RespInstanceSimple)
	for _, d := range dArr {
		// exist
		if item, ok := iMap[d.Iid]; ok {
			item.Databases = append(item.Databases, d)
			iMap[d.Iid] = item
			continue
		}
		// not exist
		ins, errInstanceInfo := db.InstanceInfo(invoker.Db, d.Iid)
		if errInstanceInfo != nil {
			return res, errInstanceInfo
		}
		dArrTemp := make([]view.RespDatabaseSimple, 0)
		dArrTemp = append(dArrTemp, d)
		iMap[d.Iid] = view.RespInstanceSimple{
			Id:           ins.ID,
			InstanceName: ins.Name,
			Desc:         ins.Desc,
			Databases:    dArrTemp,
		}
	}
	for _, v := range iMap {
		res = append(res, v)
	}
	return
}
