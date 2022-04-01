package event

import (
	"fmt"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

var (
	Event *event
)

type event struct {
	eventChan chan db.Event
}

func InitService() *event {
	obj := &event{
		eventChan: make(chan db.Event, 1000),
	}
	go obj.ConsumeEvent()
	Event = obj
	return obj
}

func (a *event) PutEvent(event db.Event) {
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

func (a *event) insert(event db.Event) error {
	if err := invoker.Db.Create(&event).Error; err != nil {
		return err
	}
	return nil
}

func (a *event) GetAllEnums() db.RespAllEnums {
	resp := db.RespAllEnums{
		SourceEnums:    db.SourceMap,
		OperationEnums: db.OperationMap,
	}
	resp.UserEnums = make(map[int]string)
	usersBase := make([]db.UserIdName, 0)
	invoker.Db.Table(db.TableNameUser).Select("id, username").Find(&usersBase)
	for _, userBase := range usersBase {
		resp.UserEnums[userBase.ID] = userBase.Username
	}
	return resp
}

func (a *event) GetEnumsOfSource(source string) (resp db.RespEnumsOfSource, err error) {
	resp.TargetSource = source
	resp.OperationEnums = make(map[string]string)
	sourceOpList, exist := db.SourceOpnMap[source]
	if !exist {
		return resp, fmt.Errorf("souce %s has no enums", source)
	}
	for _, op := range sourceOpList {
		resp.OperationEnums[op] = db.OperationMap[op]
	}
	return resp, nil
}

func (a *event) List(param view.ReqEventList) (res []db.Event, page *view.Pagination, err error) {
	page = view.NewPagination(param.Current, param.PageSize)
	query := invoker.Db.Table(db.TableMogoEvent)
	if param.Source != "" {
		query = query.Where("source = ?", param.Source)
	}
	if param.Operation != "" {
		query = query.Where("operation = ?", param.Operation)
	}
	if param.Uid > 0 {
		query = query.Where("uid = ?", param.Uid)
	}
	res = make([]db.Event, 0)
	err = query.Count(&page.Total).
		Order("ctime desc").
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
