package service

import (
	"encoding/json"
	"strconv"

	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils/mapping"
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

func IsCheckInner(createType int) bool {
	return createType == constx.TableCreateTypeJSONAsString
}

func StorageCreate(uid int, databaseInfo db.BaseDatabase, param view.ReqStorageCreate) (tableInfo db.BaseTable, err error) {
	param.SourceMapping, err = mapping.Handle(param.Source, IsCheckInner(param.CreateType))
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
	var (
		s string
		d string
		v string
		a string
	)
	if param.CreateType == constx.TableCreateTypeJSONAsString {
		s, d, v, a, err = op.CreateStorageJSONAsString(databaseInfo, param)
	} else {
		s, d, v, a, err = op.CreateStorage(databaseInfo.ID, databaseInfo, param)
	}
	if err != nil {
		err = errors.Wrap(err, "storage create failed")
		return
	}
	tableInfo = db.BaseTable{
		Did:                     databaseInfo.ID,
		Name:                    param.TableName,
		TimeFieldKind:           param.Typ,
		Days:                    param.Days,
		Brokers:                 param.Brokers,
		Topic:                   param.Topics,
		Desc:                    param.Desc,
		ConsumerNum:             param.Consumers,
		SqlData:                 d,
		SqlStream:               s,
		SqlView:                 v,
		SqlDistributed:          a,
		CreateType:              param.CreateType,
		Uid:                     uid,
		RawLogField:             param.RawLogField,
		TimeField:               db.TimeFieldSecond,
		SelectFields:            param.SelectFields(),
		AnyJSON:                 param.JSON(),
		KafkaSkipBrokenMessages: param.KafkaSkipBrokenMessages,
	}
	tx := invoker.Db.Begin()
	err = db.TableCreate(tx, &tableInfo)
	if err != nil {
		tx.Rollback()
		err = errors.WithMessage(err, "TableCreateFailed")
		return
	}
	if param.CreateType == constx.TableCreateTypeJSONAsString || param.CreateType == constx.TableCreateTypeJSONEachRow {
		columns, errListColumn := op.ListColumn(databaseInfo.Name, param.TableName, false)
		if errListColumn != nil {
			tx.Rollback()
			err = errors.WithMessage(errListColumn, "ListColumn")
			return tableInfo, err
		}
		for _, col := range columns {
			if col.Type < 0 || col.Type == 3 {
				continue
			}
			if col.Name == "_raw_log_" {
				continue
			}
			err = db.IndexCreate(tx, &db.BaseIndex{
				Tid:      tableInfo.ID,
				Field:    col.Name,
				Typ:      col.Type,
				Alias:    "",
				RootName: "",
				Kind:     0,
			})
			if err != nil {
				tx.Rollback()
				err = errors.WithMessage(err, "IndexCreateFailed")
				return tableInfo, err
			}
		}
	}
	if err = tx.Commit().Error; err != nil {
		return tableInfo, err
	}
	return tableInfo, nil
}
