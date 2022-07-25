package service

import (
	"strconv"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func DatabaseListFilterPms(uid int) (res []view.RespDatabaseSimple, err error) {
	res = make([]view.RespDatabaseSimple, 0)
	dMap := make(map[int]view.RespDatabaseSimple)
	ts, err := db.TableList(invoker.Db, egorm.Conds{})
	if err != nil {
		return
	}
	for _, row := range ts {
		if !TableViewIsPermission(uid, row.Database.Iid, row.ID) {
			continue
		}
		respTableSimple := view.RespTableSimple{
			Id:         row.ID,
			Did:        row.Database.ID,
			TableName:  row.Name,
			CreateType: row.CreateType,
			Desc:       row.Desc,
		}
		if item, ok := dMap[row.Database.ID]; ok {
			item.Tables = append(item.Tables, respTableSimple)
			dMap[row.Database.ID] = item
			continue
		}
		tArr := make([]view.RespTableSimple, 0)
		tArr = append(tArr, respTableSimple)
		dMap[row.Database.ID] = view.RespDatabaseSimple{
			Id:           row.Database.ID,
			Iid:          row.Database.Iid,
			DatabaseName: row.Database.Name,
			IsCreateByCV: row.Database.IsCreateByCV,
			Desc:         row.Database.Desc,
			Cluster:      row.Database.Cluster,
			Tables:       tArr,
		}
	}
	for _, v := range dMap {
		res = append(res, v)
	}
	return
}

func DatabaseViewIsPermission(uid, iid, tid int) bool {
	if databaseViewIsPermission(uid, iid, tid, pmsplugin.Log) ||
		databaseViewIsPermission(uid, iid, tid, pmsplugin.Alarm) ||
		databaseViewIsPermission(uid, iid, tid, pmsplugin.BigData) {
		return true
	}
	return false
}

func databaseViewIsPermission(uid, iid, did int, subResource string) bool {
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
			elog.Any("step", "DatabaseViewIsPermission"),
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
		if tableViewIsPermission(uid, iid, t.ID, subResource) {
			return true
		}
	}
	return false
}
