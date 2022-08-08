package service

import (
	"strconv"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
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
		invoker.Logger.Debug("ReadAllPermissionInstance",
			elog.Any("uid", uid),
			elog.Any("step", "DatabaseViewIsPermission"),
			elog.Any("iid", iid),
			elog.Any("tid", tid),
			elog.Any("subResource", subResource))
		return true
	}
	invoker.Logger.Warn("ReadAllPermissionInstance",
		elog.Any("uid", uid),
		elog.Any("step", "DatabaseViewIsPermission"),
		elog.Any("iid", iid),
		elog.Any("tid", tid),
		elog.Any("subResource", subResource))
	return false
}

func StorageCreate(uid int, databaseInfo db.BaseDatabase, param view.ReqStorageCreate) (tableInfo db.BaseTable, err error) {
	op, err := InstanceManager.Load(databaseInfo.Iid)
	if err != nil {
		return
	}
	s, d, v, a, err := op.StorageCreate(databaseInfo.ID, databaseInfo, param)
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
		CreateType:              inquiry.TableCreateTypeAnyJSON,
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
