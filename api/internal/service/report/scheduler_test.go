package report

import (
	"testing"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReportSchedulerUsesShanghaiLocation(t *testing.T) {
	ResetForTest()

	parser := cron.NewParser(
		cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor,
	)
	schedule, err := parser.Parse("0 0 10 * * *")
	require.NoError(t, err)

	current := time.Date(2026, 4, 7, 9, 0, 0, 0, reportScheduleLocation)
	next := schedule.Next(current)

	assert.Equal(t, "Asia/Shanghai", reportScheduleLocation.String())
	assert.Equal(t, 2026, next.Year())
	assert.Equal(t, time.April, next.Month())
	assert.Equal(t, 7, next.Day())
	assert.Equal(t, 10, next.Hour())
	assert.Equal(t, 0, next.Minute())
	assert.Equal(t, 0, next.Second())
	assert.Equal(t, reportScheduleLocation, next.Location())
}

func TestReportSchedulerSkipsEmptyCron(t *testing.T) {
	ResetForTest()

	schedule := defaultService.schedules[1001]
	schedule.Cron = " "
	defaultService.schedules[1001] = schedule

	err := defaultService.StartScheduler()
	require.NoError(t, err)
	defer defaultService.StopScheduler()

	registered, next := defaultService.scheduler.Snapshot(1001)
	assert.False(t, registered)
	assert.True(t, next.IsZero())
}

func TestValidateReportScheduleCronRejectsEmptySpec(t *testing.T) {
	err := validateReportScheduleCron(" ")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "cron 不能为空")
}
