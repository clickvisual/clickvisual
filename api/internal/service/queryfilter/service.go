package queryfilter

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"gorm.io/gorm"
)

const queryFilterTimeLayout = "2006-01-02T15:04"

var (
	memMu     sync.RWMutex
	memItems  = make(map[int]dbmodel.QueryFilterProfile)
	memAutoID int
	testDB    *gorm.DB
)

func ResetForTest() {
	memMu.Lock()
	defer memMu.Unlock()
	memItems = make(map[int]dbmodel.QueryFilterProfile)
	memAutoID = 0
	testDB = nil
}

func SetDBForTest(d *gorm.DB) {
	testDB = d
}

func Create(req view.ReqQueryFilterUpsert, operator string) (view.RespQueryFilterProfile, error) {
	model, err := buildModel(0, req, operator, "", "")
	if err != nil {
		return view.RespQueryFilterProfile{}, err
	}
	if d := currentDB(); d != nil {
		if err = d.Create(&model).Error; err != nil {
			return view.RespQueryFilterProfile{}, err
		}
		return toResp(model)
	}

	memMu.Lock()
	defer memMu.Unlock()
	memAutoID++
	now := time.Now().Unix()
	model.ID = memAutoID
	model.Ctime = now
	model.Utime = now
	memItems[model.ID] = model
	return toResp(model)
}

func List(req view.ReqQueryFilterList) ([]view.RespQueryFilterProfile, error) {
	if d := currentDB(); d != nil {
		query := d.Model(&dbmodel.QueryFilterProfile{})
		if req.InstanceID > 0 {
			query = query.Where("instance_id = ?", req.InstanceID)
		}
		if strings.TrimSpace(req.Database) != "" {
			query = query.Where("database_name = ?", req.Database)
		}
		if strings.TrimSpace(req.Table) != "" {
			query = query.Where("table_name = ?", req.Table)
		}
		var items []dbmodel.QueryFilterProfile
		if err := query.Order("id desc").Find(&items).Error; err != nil {
			return nil, err
		}
		return toRespList(items)
	}

	memMu.RLock()
	defer memMu.RUnlock()
	items := make([]dbmodel.QueryFilterProfile, 0)
	for _, item := range memItems {
		if req.InstanceID > 0 && item.InstanceID != req.InstanceID {
			continue
		}
		if strings.TrimSpace(req.Database) != "" && item.DatabaseName != req.Database {
			continue
		}
		if strings.TrimSpace(req.Table) != "" && item.TableNameRef != req.Table {
			continue
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].ID > items[j].ID })
	return toRespList(items)
}

func Get(id int) (view.RespQueryFilterProfile, error) {
	if id <= 0 {
		return view.RespQueryFilterProfile{}, fmt.Errorf("invalid filter id")
	}
	if d := currentDB(); d != nil {
		var item dbmodel.QueryFilterProfile
		if err := d.First(&item, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return view.RespQueryFilterProfile{}, fmt.Errorf("filter not found: %d", id)
			}
			return view.RespQueryFilterProfile{}, err
		}
		return toResp(item)
	}

	memMu.RLock()
	defer memMu.RUnlock()
	item, ok := memItems[id]
	if !ok {
		return view.RespQueryFilterProfile{}, fmt.Errorf("filter not found: %d", id)
	}
	return toResp(item)
}

func Update(id int, req view.ReqQueryFilterUpsert, operator string) (view.RespQueryFilterProfile, error) {
	if id <= 0 {
		return view.RespQueryFilterProfile{}, fmt.Errorf("invalid filter id")
	}
	if d := currentDB(); d != nil {
		var existing dbmodel.QueryFilterProfile
		if err := d.First(&existing, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return view.RespQueryFilterProfile{}, fmt.Errorf("filter not found: %d", id)
			}
			return view.RespQueryFilterProfile{}, err
		}
		model, err := buildModel(id, req, operator, existing.Creator, "")
		if err != nil {
			return view.RespQueryFilterProfile{}, err
		}
		updates := map[string]interface{}{
			"name":            model.Name,
			"instance_id":     model.InstanceID,
			"instance_name":   model.InstanceName,
			"database_name":   model.DatabaseName,
			"table_name":      model.TableNameRef,
			"start_time":      model.StartTime,
			"end_time":        model.EndTime,
			"conditions_json": model.ConditionsJSON,
			"updater":         model.Updater,
		}
		if err = d.Model(&existing).Updates(updates).Error; err != nil {
			return view.RespQueryFilterProfile{}, err
		}
		var updated dbmodel.QueryFilterProfile
		if err = d.First(&updated, id).Error; err != nil {
			return view.RespQueryFilterProfile{}, err
		}
		return toResp(updated)
	}

	memMu.Lock()
	defer memMu.Unlock()
	existing, ok := memItems[id]
	if !ok {
		return view.RespQueryFilterProfile{}, fmt.Errorf("filter not found: %d", id)
	}
	model, err := buildModel(id, req, operator, existing.Creator, "")
	if err != nil {
		return view.RespQueryFilterProfile{}, err
	}
	model.Ctime = existing.Ctime
	model.Utime = time.Now().Unix()
	memItems[id] = model
	return toResp(model)
}

func Delete(id int) (view.RespQueryFilterDeleteResult, error) {
	if id <= 0 {
		return view.RespQueryFilterDeleteResult{}, fmt.Errorf("invalid filter id")
	}
	if d := currentDB(); d != nil {
		var existing dbmodel.QueryFilterProfile
		if err := d.First(&existing, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return view.RespQueryFilterDeleteResult{}, fmt.Errorf("filter not found: %d", id)
			}
			return view.RespQueryFilterDeleteResult{}, err
		}
		if err := d.Delete(&existing).Error; err != nil {
			return view.RespQueryFilterDeleteResult{}, err
		}
		return view.RespQueryFilterDeleteResult{ID: id}, nil
	}

	memMu.Lock()
	defer memMu.Unlock()
	if _, ok := memItems[id]; !ok {
		return view.RespQueryFilterDeleteResult{}, fmt.Errorf("filter not found: %d", id)
	}
	delete(memItems, id)
	return view.RespQueryFilterDeleteResult{ID: id}, nil
}

func currentDB() *gorm.DB {
	if testDB != nil {
		return testDB
	}
	if invoker.Db == nil {
		return nil
	}
	return invoker.Db
}

func buildModel(id int, req view.ReqQueryFilterUpsert, operator, creator, updater string) (dbmodel.QueryFilterProfile, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("name 不能为空")
	}
	if req.InstanceID <= 0 {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("instanceId 不能为空")
	}
	if strings.TrimSpace(req.InstanceName) == "" {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("instanceName 不能为空")
	}
	if strings.TrimSpace(req.Database) == "" {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("database 不能为空")
	}
	if strings.TrimSpace(req.Table) == "" {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("table 不能为空")
	}
	if len(req.Conditions) == 0 {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("conditions 不能为空")
	}
	startTime, err := parseTime(req.TimeRange.StartTime)
	if err != nil {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("invalid startTime")
	}
	endTime, err := parseTime(req.TimeRange.EndTime)
	if err != nil {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("invalid endTime")
	}
	if !endTime.After(startTime) {
		return dbmodel.QueryFilterProfile{}, fmt.Errorf("endTime MUST be greater than startTime")
	}
	for _, condition := range req.Conditions {
		if strings.TrimSpace(condition.Field) == "" || strings.TrimSpace(condition.Operator) == "" {
			return dbmodel.QueryFilterProfile{}, fmt.Errorf("conditions field/operator 不能为空")
		}
	}
	conditionsRaw, err := json.Marshal(req.Conditions)
	if err != nil {
		return dbmodel.QueryFilterProfile{}, err
	}
	operator = strings.TrimSpace(operator)
	if operator == "" {
		operator = "system"
	}
	if strings.TrimSpace(creator) == "" {
		creator = operator
	}
	if strings.TrimSpace(updater) == "" {
		updater = operator
	}
	model := dbmodel.QueryFilterProfile{
		BaseModel:      dbmodel.BaseModel{ID: id},
		Name:           name,
		InstanceID:     req.InstanceID,
		InstanceName:   strings.TrimSpace(req.InstanceName),
		DatabaseName:   strings.TrimSpace(req.Database),
		TableNameRef:   strings.TrimSpace(req.Table),
		StartTime:      startTime,
		EndTime:        endTime,
		ConditionsJSON: string(conditionsRaw),
		Creator:        creator,
		Updater:        updater,
	}
	return model, nil
}

func parseTime(raw string) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, fmt.Errorf("empty time")
	}
	if t, err := time.ParseInLocation(queryFilterTimeLayout, raw, time.Local); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, nil
	}
	if t, err := time.ParseInLocation("2006-01-02 15:04:05", raw, time.Local); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("invalid time")
}

func toRespList(items []dbmodel.QueryFilterProfile) ([]view.RespQueryFilterProfile, error) {
	resp := make([]view.RespQueryFilterProfile, 0, len(items))
	for _, item := range items {
		row, err := toResp(item)
		if err != nil {
			return nil, err
		}
		resp = append(resp, row)
	}
	return resp, nil
}

func toResp(model dbmodel.QueryFilterProfile) (view.RespQueryFilterProfile, error) {
	conditions := make([]view.QueryFilterCondition, 0)
	if strings.TrimSpace(model.ConditionsJSON) != "" {
		if err := json.Unmarshal([]byte(model.ConditionsJSON), &conditions); err != nil {
			return view.RespQueryFilterProfile{}, err
		}
	}
	return view.RespQueryFilterProfile{
		ID:           model.ID,
		Name:         model.Name,
		InstanceID:   model.InstanceID,
		InstanceName: model.InstanceName,
		Database:     model.DatabaseName,
		Table:        model.TableNameRef,
		TimeRange: view.QueryFilterTimeRange{
			StartTime: model.StartTime.Format(queryFilterTimeLayout),
			EndTime:   model.EndTime.Format(queryFilterTimeLayout),
		},
		Conditions: conditions,
		Creator:    model.Creator,
		Updater:    model.Updater,
		Ctime:      model.Ctime,
		Utime:      model.Utime,
	}, nil
}
