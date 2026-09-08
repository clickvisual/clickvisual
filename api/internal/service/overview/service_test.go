package overview

import (
	"errors"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	d, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, d.AutoMigrate(
		&dbmodel.BaseInstance{},
		&dbmodel.BaseDatabase{},
		&dbmodel.BaseTable{},
		&dbmodel.Alarm{},
		&dbmodel.AlarmHistory{},
		&dbmodel.Report{},
		&dbmodel.ReportSchedule{},
		&dbmodel.ReportExecution{},
	))
	SetDBForTest(d)
	t.Cleanup(func() {
		SetDBForTest(nil)
		PermittedInstanceIDs = nil
		ListSystemTables = nil
	})
	return d
}

func seedFixture(t *testing.T, d *gorm.DB, now time.Time) {
	t.Helper()
	day := int64(24 * 3600)
	nowUnix := now.Unix()

	require.NoError(t, d.Create(&dbmodel.BaseInstance{BaseModel: dbmodel.BaseModel{ID: 1}, Name: "ch-a"}).Error)
	require.NoError(t, d.Create(&dbmodel.BaseInstance{BaseModel: dbmodel.BaseModel{ID: 2}, Name: "ch-b"}).Error)
	require.NoError(t, d.Create(&dbmodel.BaseInstance{BaseModel: dbmodel.BaseModel{ID: 3}, Name: "ch-hidden"}).Error)

	require.NoError(t, d.Create(&dbmodel.BaseDatabase{BaseModel: dbmodel.BaseModel{ID: 10}, Iid: 1, Name: "app"}).Error)
	require.NoError(t, d.Create(&dbmodel.BaseDatabase{BaseModel: dbmodel.BaseModel{ID: 20}, Iid: 2, Name: "infra"}).Error)
	require.NoError(t, d.Create(&dbmodel.BaseDatabase{BaseModel: dbmodel.BaseModel{ID: 30}, Iid: 3, Name: "secret"}).Error)

	tables := []dbmodel.BaseTable{
		{BaseModel: dbmodel.BaseModel{ID: 100, Ctime: nowUnix - 30*day}, Did: 10, Name: "logs", CreateType: constx.TableCreateTypeJSONEachRow},
		{BaseModel: dbmodel.BaseModel{ID: 101, Ctime: nowUnix - 2*day}, Did: 10, Name: "access", CreateType: constx.TableCreateTypeExist},
		{BaseModel: dbmodel.BaseModel{ID: 200, Ctime: nowUnix - 1*day}, Did: 20, Name: "metrics", CreateType: constx.TableCreateTypeJSONAsString},
		{BaseModel: dbmodel.BaseModel{ID: 300, Ctime: nowUnix - 1*day}, Did: 30, Name: "hidden", CreateType: constx.TableCreateTypeExist},
	}
	for i := range tables {
		require.NoError(t, d.Create(&tables[i]).Error)
	}

	alarms := []dbmodel.Alarm{
		{BaseModel: dbmodel.BaseModel{ID: 1, Utime: nowUnix - 10}, Name: "cpu high", Status: dbmodel.AlarmStatusFiring, Level: 2, Tid: 100},
		{BaseModel: dbmodel.BaseModel{ID: 2, Utime: nowUnix - 20}, Name: "disk full", Status: dbmodel.AlarmStatusFiring, Level: 0, TableIds: dbmodel.Ints{300}},
		{BaseModel: dbmodel.BaseModel{ID: 3, Utime: nowUnix - 30}, Name: "latency", Status: dbmodel.AlarmStatusNormal, Level: 1, Tid: 200},
		{BaseModel: dbmodel.BaseModel{ID: 4, Utime: nowUnix - 40}, Name: "closed", Status: dbmodel.AlarmStatusClose, Level: 0, Tid: 200},
		{BaseModel: dbmodel.BaseModel{ID: 5, Utime: nowUnix - 50}, Name: "broken", Status: dbmodel.AlarmStatusRuleCheck, Level: 2, Tid: 101},
	}
	for i := range alarms {
		require.NoError(t, d.Create(&alarms[i]).Error)
	}

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	histories := []dbmodel.AlarmHistory{
		{BaseModel: dbmodel.BaseModel{ID: 1, Ctime: todayStart + 60}, AlarmId: 1, IsPushed: dbmodel.PushedStatusSuccess},
		{BaseModel: dbmodel.BaseModel{ID: 2, Ctime: todayStart + 120}, AlarmId: 1, IsPushed: dbmodel.PushedStatusFail},
		{BaseModel: dbmodel.BaseModel{ID: 3, Ctime: todayStart - 3*day + 60}, AlarmId: 2, IsPushed: dbmodel.PushedStatusRepeat},
		{BaseModel: dbmodel.BaseModel{ID: 4, Ctime: todayStart - 10*day}, AlarmId: 2, IsPushed: dbmodel.PushedStatusSuccess},
	}
	for i := range histories {
		require.NoError(t, d.Create(&histories[i]).Error)
	}

	reports := []dbmodel.Report{
		{BaseModel: dbmodel.BaseModel{ID: 1, Utime: nowUnix - 5}, Name: "daily", Status: "enabled", TemplateKey: "t"},
		{BaseModel: dbmodel.BaseModel{ID: 2, Utime: nowUnix - 500}, Name: "weekly", Status: "disabled", TemplateKey: "t"},
	}
	for i := range reports {
		require.NoError(t, d.Create(&reports[i]).Error)
	}
	require.NoError(t, d.Create(&dbmodel.ReportSchedule{ReportID: 1, Cron: "0 9 * * *", Status: "enabled", ChannelIDs: dbmodel.Ints{}}).Error)
	require.NoError(t, d.Create(&dbmodel.ReportSchedule{ReportID: 2, Cron: "0 9 * * 1", Status: "disabled", ChannelIDs: dbmodel.Ints{}}).Error)

	executions := []dbmodel.ReportExecution{
		{BaseModel: dbmodel.BaseModel{ID: 1}, ReportID: 1, Trigger: "schedule", Status: dbmodel.ReportExecutionStatusSuccess, StartedAt: todayStart + 10, DurationSeconds: 3},
		{BaseModel: dbmodel.BaseModel{ID: 2}, ReportID: 1, Trigger: "manual", Status: dbmodel.ReportExecutionStatusFailed, StartedAt: todayStart + 20, DurationSeconds: 1},
		{BaseModel: dbmodel.BaseModel{ID: 3}, ReportID: 2, Trigger: "manual", Status: dbmodel.ReportExecutionStatusRunning, StartedAt: todayStart + 30},
		{BaseModel: dbmodel.BaseModel{ID: 4}, ReportID: 2, Trigger: "schedule", Status: dbmodel.ReportExecutionStatusPartial, StartedAt: todayStart - 2*day},
	}
	for i := range executions {
		require.NoError(t, d.Create(&executions[i]).Error)
	}
}

func TestSummaryAggregatesRealMetadata(t *testing.T) {
	d := newTestDB(t)
	now := time.Date(2026, 9, 8, 15, 0, 0, 0, time.Local)
	seedFixture(t, d, now)

	PermittedInstanceIDs = func(uid int) ([]int, error) {
		return []int{1, 2}, nil
	}
	ListSystemTables = func(iid int) ([]*view.SystemTables, error) {
		switch iid {
		case 1:
			return []*view.SystemTables{
				{Database: "app", Table: "logs", TotalRows: 1000, TotalBytes: 4096},
				{Database: "app", Table: "access", TotalRows: 50, TotalBytes: 512},
				{Database: "app", Table: "not_managed", TotalRows: 99999, TotalBytes: 1},
			}, nil
		case 2:
			return nil, errors.New("connection refused")
		}
		return nil, nil
	}

	res, err := Summary(7, now)
	require.NoError(t, err)
	assert.Equal(t, now.Unix(), res.GeneratedAt)

	ing := res.Ingestion
	assert.Equal(t, 2, ing.InstanceCount)
	assert.Equal(t, 2, ing.DatabaseCount)
	assert.Equal(t, 3, ing.TableCount)
	assert.Equal(t, 2, ing.NewTablesLast7Days)
	assert.Equal(t, uint64(1050), ing.TotalRows)
	assert.Equal(t, uint64(4608), ing.TotalBytes)
	assert.Equal(t, []string{"ch-b"}, ing.VolumeUnavailableInstances)
	require.Len(t, ing.TopTables, 2)
	assert.Equal(t, "logs", ing.TopTables[0].TableName)
	assert.Equal(t, "ch-a", ing.TopTables[0].InstanceName)
	assert.Equal(t, uint64(1000), ing.TopTables[0].TotalRows)
	require.Len(t, ing.RecentTables, 3)
	assert.Equal(t, "metrics", ing.RecentTables[0].TableName)
	assert.Equal(t, "access", ing.RecentTables[1].TableName)
	assert.Equal(t, "logs", ing.RecentTables[2].TableName)
	createTypeCounts := map[int]int{}
	for _, item := range ing.CreateTypes {
		createTypeCounts[item.CreateType] = item.Count
		assert.NotEmpty(t, item.Label)
	}
	assert.Equal(t, map[int]int{
		constx.TableCreateTypeJSONEachRow:  1,
		constx.TableCreateTypeExist:        1,
		constx.TableCreateTypeJSONAsString: 1,
	}, createTypeCounts)

	al := res.Alarm
	assert.Equal(t, 5, al.Total)
	assert.Equal(t, 1, al.Normal)
	assert.Equal(t, 2, al.Firing)
	assert.Equal(t, 1, al.Closed)
	assert.Equal(t, 1, al.RuleCheck)
	assert.Equal(t, 2, al.LevelAlarm)
	assert.Equal(t, 1, al.LevelNotice)
	assert.Equal(t, 2, al.LevelSerious)
	assert.Equal(t, 2, al.TodayCount)
	assert.Equal(t, 3, al.Last7DayCount)
	assert.Equal(t, 1, al.PushSuccess)
	assert.Equal(t, 1, al.PushFail)
	assert.Equal(t, 1, al.PushRepeat)
	require.Len(t, al.DailyTrend, 7)
	assert.Equal(t, "09-08", al.DailyTrend[6].Date)
	assert.Equal(t, 2, al.DailyTrend[6].Count)
	assert.Equal(t, "09-05", al.DailyTrend[3].Date)
	assert.Equal(t, 1, al.DailyTrend[3].Count)
	require.Len(t, al.RecentFiring, 1, "alarm bound to hidden instance must be filtered out")
	assert.Equal(t, "cpu high", al.RecentFiring[0].Name)

	rp := res.Report
	assert.Equal(t, 2, rp.Total)
	assert.Equal(t, 1, rp.Enabled)
	assert.Equal(t, 1, rp.Disabled)
	assert.Equal(t, 2, rp.ScheduleTotal)
	assert.Equal(t, 1, rp.ScheduleEnabled)
	assert.Equal(t, 3, rp.TodayExecutions)
	assert.Equal(t, 1, rp.TodaySuccess)
	assert.Equal(t, 1, rp.TodayFailed)
	assert.Equal(t, 0, rp.TodayPartial)
	assert.Equal(t, 1, rp.Running)
	require.Len(t, rp.RecentExecutions, 4)
	assert.Equal(t, 3, rp.RecentExecutions[0].ID)
	assert.Equal(t, "weekly", rp.RecentExecutions[0].ReportName)
	assert.Equal(t, 4, rp.RecentExecutions[3].ID)
	require.Len(t, rp.RecentReports, 2)
	assert.Equal(t, "daily", rp.RecentReports[0].Name)
}

func TestSummaryWithoutInjectedDependenciesUsesAllInstances(t *testing.T) {
	d := newTestDB(t)
	now := time.Date(2026, 9, 8, 15, 0, 0, 0, time.Local)
	seedFixture(t, d, now)

	res, err := Summary(1, now)
	require.NoError(t, err)
	assert.Equal(t, 3, res.Ingestion.InstanceCount)
	assert.Equal(t, 4, res.Ingestion.TableCount)
	assert.Equal(t, uint64(0), res.Ingestion.TotalRows)
	assert.Empty(t, res.Ingestion.TopTables)
	assert.Len(t, res.Alarm.RecentFiring, 2)
}

func TestSummaryRequiresDatabase(t *testing.T) {
	SetDBForTest(nil)
	_, err := Summary(1, time.Now())
	require.Error(t, err)
}
