package event

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var (
	Event *event
)

type event struct {
	eventChan chan db2.Event
}

func InitService() *event {
	obj := &event{
		eventChan: make(chan db2.Event, 1000),
	}
	go obj.ConsumeEvent()
	Event = obj
	return obj
}

func (a *event) PutEvent(event db2.Event) {
	select {
	case a.eventChan <- event:
	default:
	}
}

func (a *event) ConsumeEvent() {
	var err error
	for value := range a.eventChan {
		err = a.insert(value)
		if err != nil {
			continue
		}
	}
}

func (a *event) insert(event db2.Event) error {
	if err := invoker.Db.Create(&event).Error; err != nil {
		return err
	}
	return nil
}

func (a *event) GetAllEnums() db2.RespAllEnums {
	resp := db2.RespAllEnums{
		SourceEnums:    db2.SourceMap,
		OperationEnums: db2.OperationMap,
	}
	resp.UserEnums = make(map[int]string)
	usersBase := make([]db2.UserIdName, 0)
	invoker.Db.Table(db2.TableNameUser).Select("id, username").Find(&usersBase)
	for _, userBase := range usersBase {
		resp.UserEnums[userBase.ID] = userBase.Username
	}
	return resp
}

func (a *event) GetEnumsOfSource(source string) (resp db2.RespEnumsOfSource, err error) {
	resp.TargetSource = source
	resp.OperationEnums = make(map[string]string)
	sourceOpList, exist := db2.SourceOpnMap[source]
	if !exist {
		return resp, fmt.Errorf("souce %s has no enums", source)
	}
	for _, op := range sourceOpList {
		resp.OperationEnums[op] = db2.OperationMap[op]
	}
	return resp, nil
}

func (a *event) List(param view2.ReqEventList) (res []db2.Event, page *view2.Pagination, err error) {
	page = view2.NewPagination(param.Current, param.PageSize)
	query := invoker.Db.Table(db2.TableNameEvent)
	if param.Source != "" {
		query = query.Where("source = ?", param.Source)
	}
	if param.Operation != "" {
		query = query.Where("operation = ?", param.Operation)
	}
	if param.Uid > 0 {
		query = query.Where("uid = ?", param.Uid)
	}
	res = make([]db2.Event, 0)
	err = query.Count(&page.Total).
		Order("id desc").
		Offset((page.Current - 1) * page.PageSize).
		Limit(page.PageSize).
		Find(&res).Error
	if err != nil {
		return nil, nil, fmt.Errorf("查询事件列表失败")
	}
	for index, item := range res {
		item.HandleOperationName()
		item.HandleSourceName()
		res[index] = item
	}
	return
}
