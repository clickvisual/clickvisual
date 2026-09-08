// Package overview aggregates metadata statistics for the v2 overview dashboard.
//
// It only reads the metadata database plus one `system.tables` query per
// visible instance; it never scans log data.
package overview

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const (
	trendDays  = 7
	topLimit   = 5
	listLimit  = 5
	dailyLabel = "01-02"
)

var (
	testDB *gorm.DB

	// PermittedInstanceIDs returns the instance ids visible to the user.
	// When nil, every instance is treated as visible.
	PermittedInstanceIDs func(uid int) ([]int, error)

	// ListSystemTables loads `system.tables` rows for one instance.
	// When nil, volume statistics are skipped.
	ListSystemTables func(iid int) ([]*view.SystemTables, error)

	// SystemTablesTimeout bounds the wait for a single instance volume query.
	SystemTablesTimeout = 5 * time.Second
)

func SetDBForTest(d *gorm.DB) {
	testDB = d
}

func currentDB() *gorm.DB {
	if testDB != nil {
		return testDB
	}
	return invoker.Db
}

func createTypeLabel(createType int) string {
	switch createType {
	case constx.TableCreateTypeExist:
		return "接入已有表"
	case constx.TableCreateTypeJSONEachRow:
		return "JSONEachRow"
	case constx.TableCreateTypeJSONAsString:
		return "JSONAsString"
	case constx.TableCreateTypeTraceCalculation:
		return "Trace 计算"
	case constx.TableCreateTypeBufferNullDataPipe:
		return "Buffer Null 管道"
	case constx.TableCreateTypeCV, constx.TableCreateTypeUBW:
		return "旧版 String 建表"
	default:
		return fmt.Sprintf("类型 %d", createType)
	}
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// Summary builds the overview payload for uid at the given point in time.
func Summary(uid int, now time.Time) (view.RespOverviewSummary, error) {
	d := currentDB()
	if d == nil {
		return view.RespOverviewSummary{}, fmt.Errorf("metadata database is not attached")
	}

	scope, err := loadScope(d, uid, now)
	if err != nil {
		return view.RespOverviewSummary{}, err
	}

	res := view.RespOverviewSummary{GeneratedAt: now.Unix()}
	res.Ingestion = buildIngestion(scope, now)
	if res.Alarm, err = buildAlarm(d, scope, now); err != nil {
		return view.RespOverviewSummary{}, err
	}
	if res.Report, err = buildReport(d, now); err != nil {
		return view.RespOverviewSummary{}, err
	}
	return res, nil
}

// scope holds the metadata visible to the requesting user.
type scope struct {
	instances []dbmodel.BaseInstance
	databases map[int]dbmodel.BaseDatabase
	tables    []dbmodel.BaseTable
	tableIDs  map[int]struct{}
}

func loadScope(d *gorm.DB, uid int, now time.Time) (*scope, error) {
	var instances []dbmodel.BaseInstance
	if err := d.Model(&dbmodel.BaseInstance{}).Order("id asc").Find(&instances).Error; err != nil {
		return nil, fmt.Errorf("list instances: %w", err)
	}
	if PermittedInstanceIDs != nil {
		ids, err := PermittedInstanceIDs(uid)
		if err != nil {
			return nil, fmt.Errorf("resolve instance permission: %w", err)
		}
		allowed := make(map[int]struct{}, len(ids))
		for _, id := range ids {
			allowed[id] = struct{}{}
		}
		filtered := instances[:0]
		for _, item := range instances {
			if _, ok := allowed[item.ID]; ok {
				filtered = append(filtered, item)
			}
		}
		instances = filtered
	}

	instanceIDs := make([]int, 0, len(instances))
	for _, item := range instances {
		instanceIDs = append(instanceIDs, item.ID)
	}

	s := &scope{
		instances: instances,
		databases: map[int]dbmodel.BaseDatabase{},
		tableIDs:  map[int]struct{}{},
	}
	if len(instanceIDs) == 0 {
		return s, nil
	}

	var databases []dbmodel.BaseDatabase
	if err := d.Model(&dbmodel.BaseDatabase{}).Where("iid IN ?", instanceIDs).Find(&databases).Error; err != nil {
		return nil, fmt.Errorf("list databases: %w", err)
	}
	databaseIDs := make([]int, 0, len(databases))
	for _, item := range databases {
		s.databases[item.ID] = item
		databaseIDs = append(databaseIDs, item.ID)
	}
	if len(databaseIDs) == 0 {
		return s, nil
	}

	if err := d.Model(&dbmodel.BaseTable{}).Where("did IN ?", databaseIDs).Find(&s.tables).Error; err != nil {
		return nil, fmt.Errorf("list tables: %w", err)
	}
	for _, item := range s.tables {
		s.tableIDs[item.ID] = struct{}{}
	}
	return s, nil
}

func (s *scope) instanceName(iid int) string {
	for _, item := range s.instances {
		if item.ID == iid {
			return item.Name
		}
	}
	return ""
}

func (s *scope) tableItem(table dbmodel.BaseTable) view.RespOverviewTableItem {
	database := s.databases[table.Did]
	return view.RespOverviewTableItem{
		TableID:      table.ID,
		InstanceID:   database.Iid,
		InstanceName: s.instanceName(database.Iid),
		DatabaseName: database.Name,
		TableName:    table.Name,
		CreateType:   table.CreateType,
		Ctime:        table.Ctime,
	}
}

type volumeKey struct {
	iid      int
	database string
	table    string
}

type volumeValue struct {
	rows  uint64
	bytes uint64
}

func loadVolumes(s *scope) (map[volumeKey]volumeValue, []string) {
	volumes := map[volumeKey]volumeValue{}
	if ListSystemTables == nil || len(s.instances) == 0 {
		return volumes, []string{}
	}

	type result struct {
		iid  int
		rows []*view.SystemTables
		err  error
	}
	results := make([]result, len(s.instances))
	var wg sync.WaitGroup
	for index, instance := range s.instances {
		wg.Add(1)
		go func(index int, iid int) {
			defer wg.Done()
			done := make(chan result, 1)
			go func() {
				rows, err := ListSystemTables(iid)
				done <- result{iid: iid, rows: rows, err: err}
			}()
			select {
			case r := <-done:
				results[index] = r
			case <-time.After(SystemTablesTimeout):
				results[index] = result{iid: iid, err: fmt.Errorf("system.tables query timed out")}
			}
		}(index, instance.ID)
	}
	wg.Wait()

	unavailable := []string{}
	for _, r := range results {
		if r.err != nil {
			unavailable = append(unavailable, s.instanceName(r.iid))
			continue
		}
		for _, row := range r.rows {
			if row == nil {
				continue
			}
			volumes[volumeKey{iid: r.iid, database: row.Database, table: row.Table}] = volumeValue{rows: row.TotalRows, bytes: row.TotalBytes}
		}
	}
	return volumes, unavailable
}

func buildIngestion(s *scope, now time.Time) view.RespOverviewIngestion {
	res := view.RespOverviewIngestion{
		InstanceCount:              len(s.instances),
		DatabaseCount:              len(s.databases),
		TableCount:                 len(s.tables),
		CreateTypes:                []view.RespOverviewCreateTypeItem{},
		VolumeUnavailableInstances: []string{},
		TopTables:                  []view.RespOverviewTableVolume{},
		RecentTables:               []view.RespOverviewTableItem{},
	}

	weekAgo := now.Add(-trendDays * 24 * time.Hour).Unix()
	createTypeCounts := map[int]int{}
	for _, table := range s.tables {
		if table.Ctime >= weekAgo {
			res.NewTablesLast7Days++
		}
		createTypeCounts[table.CreateType]++
	}
	for createType, count := range createTypeCounts {
		res.CreateTypes = append(res.CreateTypes, view.RespOverviewCreateTypeItem{
			CreateType: createType,
			Label:      createTypeLabel(createType),
			Count:      count,
		})
	}
	sort.Slice(res.CreateTypes, func(i, j int) bool {
		if res.CreateTypes[i].Count != res.CreateTypes[j].Count {
			return res.CreateTypes[i].Count > res.CreateTypes[j].Count
		}
		return res.CreateTypes[i].CreateType < res.CreateTypes[j].CreateType
	})

	volumes, unavailable := loadVolumes(s)
	res.VolumeUnavailableInstances = unavailable
	for _, table := range s.tables {
		database := s.databases[table.Did]
		volume, ok := volumes[volumeKey{iid: database.Iid, database: database.Name, table: table.Name}]
		if !ok {
			continue
		}
		res.TotalRows += volume.rows
		res.TotalBytes += volume.bytes
		if volume.rows == 0 {
			continue
		}
		res.TopTables = append(res.TopTables, view.RespOverviewTableVolume{
			RespOverviewTableItem: s.tableItem(table),
			TotalRows:             volume.rows,
			TotalBytes:            volume.bytes,
		})
	}
	sort.Slice(res.TopTables, func(i, j int) bool {
		if res.TopTables[i].TotalRows != res.TopTables[j].TotalRows {
			return res.TopTables[i].TotalRows > res.TopTables[j].TotalRows
		}
		return res.TopTables[i].TableID < res.TopTables[j].TableID
	})
	if len(res.TopTables) > topLimit {
		res.TopTables = res.TopTables[:topLimit]
	}

	recent := make([]dbmodel.BaseTable, len(s.tables))
	copy(recent, s.tables)
	sort.Slice(recent, func(i, j int) bool {
		if recent[i].Ctime != recent[j].Ctime {
			return recent[i].Ctime > recent[j].Ctime
		}
		return recent[i].ID > recent[j].ID
	})
	for index, table := range recent {
		if index >= listLimit {
			break
		}
		res.RecentTables = append(res.RecentTables, s.tableItem(table))
	}
	return res
}

func (s *scope) alarmVisible(alarm dbmodel.Alarm) bool {
	if PermittedInstanceIDs == nil {
		return true
	}
	if _, ok := s.tableIDs[alarm.Tid]; ok {
		return true
	}
	for _, tid := range alarm.TableIds {
		if _, ok := s.tableIDs[tid]; ok {
			return true
		}
	}
	return false
}

func buildAlarm(d *gorm.DB, s *scope, now time.Time) (view.RespOverviewAlarm, error) {
	res := view.RespOverviewAlarm{
		DailyTrend:   make([]view.RespOverviewDailyItem, 0, trendDays),
		RecentFiring: []view.RespOverviewAlarmItem{},
	}

	var alarms []dbmodel.Alarm
	if err := d.Model(&dbmodel.Alarm{}).Find(&alarms).Error; err != nil {
		return res, fmt.Errorf("list alarms: %w", err)
	}
	res.Total = len(alarms)
	firing := make([]dbmodel.Alarm, 0)
	for _, alarm := range alarms {
		switch alarm.Status {
		case dbmodel.AlarmStatusNormal:
			res.Normal++
		case dbmodel.AlarmStatusFiring:
			res.Firing++
			if s.alarmVisible(alarm) {
				firing = append(firing, alarm)
			}
		case dbmodel.AlarmStatusClose:
			res.Closed++
		case dbmodel.AlarmStatusRuleCheck:
			res.RuleCheck++
		}
		switch alarm.Level {
		case 0:
			res.LevelAlarm++
		case 1:
			res.LevelNotice++
		case 2:
			res.LevelSerious++
		}
	}
	sort.Slice(firing, func(i, j int) bool {
		if firing[i].Utime != firing[j].Utime {
			return firing[i].Utime > firing[j].Utime
		}
		return firing[i].ID > firing[j].ID
	})
	for index, alarm := range firing {
		if index >= listLimit {
			break
		}
		res.RecentFiring = append(res.RecentFiring, view.RespOverviewAlarmItem{
			ID:     alarm.ID,
			Name:   alarm.Name,
			Status: alarm.Status,
			Level:  alarm.Level,
			Utime:  alarm.Utime,
		})
	}

	today := startOfDay(now)
	windowStart := today.AddDate(0, 0, -(trendDays - 1))
	var histories []dbmodel.AlarmHistory
	if err := d.Model(&dbmodel.AlarmHistory{}).Where("ctime >= ?", windowStart.Unix()).Find(&histories).Error; err != nil {
		return res, fmt.Errorf("list alarm histories: %w", err)
	}
	daily := make([]int, trendDays)
	for _, history := range histories {
		res.Last7DayCount++
		if history.Ctime >= today.Unix() {
			res.TodayCount++
		}
		switch history.IsPushed {
		case dbmodel.PushedStatusSuccess:
			res.PushSuccess++
		case dbmodel.PushedStatusFail:
			res.PushFail++
		case dbmodel.PushedStatusRepeat:
			res.PushRepeat++
		}
		dayIndex := int(time.Unix(history.Ctime, 0).In(now.Location()).Sub(windowStart).Hours() / 24)
		if dayIndex >= 0 && dayIndex < trendDays {
			daily[dayIndex]++
		}
	}
	for index := 0; index < trendDays; index++ {
		res.DailyTrend = append(res.DailyTrend, view.RespOverviewDailyItem{
			Date:  windowStart.AddDate(0, 0, index).Format(dailyLabel),
			Count: daily[index],
		})
	}
	return res, nil
}

func buildReport(d *gorm.DB, now time.Time) (view.RespOverviewReport, error) {
	res := view.RespOverviewReport{
		RecentExecutions: []view.RespOverviewReportExecution{},
		RecentReports:    []view.RespOverviewReportItem{},
	}

	var reports []dbmodel.Report
	if err := d.Model(&dbmodel.Report{}).Find(&reports).Error; err != nil {
		return res, fmt.Errorf("list reports: %w", err)
	}
	res.Total = len(reports)
	names := make(map[int]string, len(reports))
	for _, report := range reports {
		names[report.ID] = report.Name
		if report.Status == "enabled" {
			res.Enabled++
		} else {
			res.Disabled++
		}
	}
	sort.Slice(reports, func(i, j int) bool {
		if reports[i].Utime != reports[j].Utime {
			return reports[i].Utime > reports[j].Utime
		}
		return reports[i].ID > reports[j].ID
	})
	for index, report := range reports {
		if index >= listLimit {
			break
		}
		res.RecentReports = append(res.RecentReports, view.RespOverviewReportItem{
			ID:     report.ID,
			Name:   report.Name,
			Status: report.Status,
			Utime:  report.Utime,
		})
	}

	var schedules []dbmodel.ReportSchedule
	if err := d.Model(&dbmodel.ReportSchedule{}).Find(&schedules).Error; err != nil {
		return res, fmt.Errorf("list report schedules: %w", err)
	}
	res.ScheduleTotal = len(schedules)
	for _, schedule := range schedules {
		if schedule.Status == "enabled" {
			res.ScheduleEnabled++
		}
	}

	todayStart := startOfDay(now).Unix()
	var todayExecutions []dbmodel.ReportExecution
	if err := d.Model(&dbmodel.ReportExecution{}).Where("started_at >= ?", todayStart).Find(&todayExecutions).Error; err != nil {
		return res, fmt.Errorf("list today report executions: %w", err)
	}
	res.TodayExecutions = len(todayExecutions)
	for _, execution := range todayExecutions {
		switch execution.Status {
		case dbmodel.ReportExecutionStatusSuccess:
			res.TodaySuccess++
		case dbmodel.ReportExecutionStatusFailed:
			res.TodayFailed++
		case dbmodel.ReportExecutionStatusPartial:
			res.TodayPartial++
		}
	}

	var running int64
	if err := d.Model(&dbmodel.ReportExecution{}).Where("status = ?", dbmodel.ReportExecutionStatusRunning).Count(&running).Error; err != nil {
		return res, fmt.Errorf("count running report executions: %w", err)
	}
	res.Running = int(running)

	var recent []dbmodel.ReportExecution
	if err := d.Model(&dbmodel.ReportExecution{}).Order("started_at desc, id desc").Limit(listLimit).Find(&recent).Error; err != nil {
		return res, fmt.Errorf("list recent report executions: %w", err)
	}
	for _, execution := range recent {
		res.RecentExecutions = append(res.RecentExecutions, view.RespOverviewReportExecution{
			ID:              execution.ID,
			ReportID:        execution.ReportID,
			ReportName:      names[execution.ReportID],
			Status:          execution.Status,
			Trigger:         execution.Trigger,
			StartedAt:       execution.StartedAt,
			DurationSeconds: execution.DurationSeconds,
		})
	}
	return res, nil
}
