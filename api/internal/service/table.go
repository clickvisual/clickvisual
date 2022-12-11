package service

import (
	"encoding/json"
	"strconv"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/mapping"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func TableViewIsPermission(uid, iid, tid int) bool {
	if tableViewIsPermission(uid, iid, tid, pmsplugin.Log) ||
		tableViewIsPermission(uid, iid, tid, pmsplugin.Alarm) ||
		tableViewIsPermission(uid, iid, tid, pmsplugin.Pandas) {
		return true
	}
	return false
}

func tableViewIsPermission(uid, iid, tid int, subResource string) bool {
	// check database permission
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      uid,
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(iid),
		SubResource: subResource,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tid),
	}); err == nil {
		elog.Debug("ReadAllPermissionInstance",
			elog.Any("uid", uid),
			elog.Any("step", "DatabaseViewIsPermission"),
			elog.Any("iid", iid),
			elog.Any("tid", tid),
			elog.Any("subResource", subResource))
		return true
	}
	elog.Warn("ReadAllPermissionInstance",
		elog.Any("uid", uid),
		elog.Any("step", "DatabaseViewIsPermission"),
		elog.Any("iid", iid),
		elog.Any("tid", tid),
		elog.Any("subResource", subResource))
	return false
}

func StorageCreate(uid int, databaseInfo db.BaseDatabase, param view.ReqStorageCreate) (tableInfo db.BaseTable, err error) {
	param.SourceMapping, err = mapping.Handle(param.Source)
	if err != nil {
		return
	}
	if err = json.Unmarshal([]byte(param.Source), &param.SourceMapping); err != nil {
		return
	}
	op, err := InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		return
	}
	s, d, v, a, err := op.CreateStorage(databaseInfo.ID, databaseInfo, param)
	if err != nil {
		err = errors.Wrap(err, "create failed 01:")
		return
	}
	tableInfo = db.BaseTable{
		Did:                     databaseInfo.ID,
		Name:                    param.TableName,
		Typ:                     param.Typ,
		Days:                    param.Days,
		Brokers:                 param.Brokers,
		Topic:                   param.Topics,
		Desc:                    param.Desc,
		SqlData:                 d,
		SqlStream:               s,
		SqlView:                 v,
		SqlDistributed:          a,
		CreateType:              constx.TableCreateTypeJSONEachRow,
		Uid:                     uid,
		RawLogField:             param.RawLogField,
		TimeField:               db.TimeFieldSecond,
		SelectFields:            param.SelectFields(),
		AnyJSON:                 param.JSON(),
		KafkaSkipBrokenMessages: param.KafkaSkipBrokenMessages,
	}
	err = db.TableCreate(invoker.Db, &tableInfo)
	if err != nil {
		err = errors.Wrap(err, "create failed 02:")
		return
	}
	return tableInfo, nil
}

func StorageCreateV3(uid int, databaseInfo db.BaseDatabase, param view.ReqStorageCreateV3) (tableInfo db.BaseTable, err error) {
	op, err := InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		return
	}
	var s, d, v, a = "", "", "", ""
	var names []string
	var sqls []string
	switch param.CreateType {
	case constx.TableCreateTypeBufferNullDataPipe:
		names, sqls, err = op.CreateBufferNullDataPipe(db.ReqCreateBufferNullDataPipe{
			Cluster:  databaseInfo.Cluster,
			Database: databaseInfo.Name,
			Table:    param.TableName,
			TTL:      param.Days,
		})
		if err != nil {
			return
		}
	default:
		s, d, v, a, err = op.CreateStorageV3(databaseInfo.ID, databaseInfo, param)
		if err != nil {
			return
		}
	}
	tableInfo = db.BaseTable{
		Did:                     databaseInfo.ID,
		Name:                    param.TableName,
		Typ:                     param.TimeFieldType,
		Days:                    param.Days,
		Brokers:                 param.Brokers,
		Topic:                   param.Topics,
		Desc:                    param.Desc,
		SqlData:                 d,
		SqlStream:               s,
		SqlView:                 v,
		SqlDistributed:          a,
		CreateType:              param.CreateType,
		Uid:                     uid,
		TimeField:               param.TimeField,
		KafkaSkipBrokenMessages: param.KafkaSkipBrokenMessages,
		V3TableType:             param.V3TableType,
		IsKafkaTimestamp:        param.IsKafkaTimestamp,
	}
	tx := invoker.Db.Begin()
	err = db.TableCreate(tx, &tableInfo)
	if err != nil {
		tx.Rollback()
		err = errors.Wrap(err, "create failed 02:")
		return
	}
	tableAttach := db.BaseTableAttach{
		Tid:   tableInfo.ID,
		SQLs:  sqls,
		Names: names,
	}
	if err = tableAttach.Create(tx); err != nil {
		tx.Rollback()
		return
	}
	if err = tx.Commit().Error; err != nil {
		return tableInfo, err
	}
	return tableInfo, nil
}
