package service

import (
	"github.com/ego-component/egorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func DatabaseListFilterPms(uid int, sr string) (res []view.RespDatabaseSimple, err error) {
	res = make([]view.RespDatabaseSimple, 0)
	dMap := make(map[int]view.RespDatabaseSimple)
	ts, err := db.TableList(invoker.Db, egorm.Conds{})
	if err != nil {
		return
	}
	for _, row := range ts {
		if !TableIsPermission(uid, row.Database.Iid, row.ID, sr) {
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
