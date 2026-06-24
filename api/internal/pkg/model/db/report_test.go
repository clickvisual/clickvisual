package db

import (
	"reflect"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReportTableName(t *testing.T) {
	assert.Equal(t, TableNameReport, (&Report{}).TableName())
	assert.Equal(t, TableNameReportSchedule, (&ReportSchedule{}).TableName())
	assert.Equal(t, TableNameReportExecution, (&ReportExecution{}).TableName())
	assert.Equal(t, TableNameReportAcceleration, (&ReportAcceleration{}).TableName())
}

func TestReportConstants(t *testing.T) {
	assert.Equal(t, "enabled", ReportStatusEnabled)
	assert.Equal(t, "paused", ReportStatusPaused)
	assert.Equal(t, "sql", ReportQueryModeSQL)
	assert.Equal(t, "markdown", ReportOutputFormatMarkdown)
	assert.Equal(t, "manual", ReportTriggerManual)
	assert.Equal(t, "schedule", ReportTriggerSchedule)
	assert.Equal(t, "running", ReportExecutionStatusRunning)
	assert.Equal(t, "success", ReportExecutionStatusSuccess)
	assert.Equal(t, "failed", ReportExecutionStatusFailed)
	assert.Equal(t, "pending", ReportAccelerationStatusPending)
	assert.Equal(t, "ready", ReportAccelerationStatusReady)
	assert.Equal(t, "error", ReportAccelerationStatusError)
}

func TestReportModelTags(t *testing.T) {
	reportTyp := reflect.TypeOf(Report{})
	statusField, ok := reportTyp.FieldByName("Status")
	require.True(t, ok)
	assert.Contains(t, statusField.Tag.Get("gorm"), "default:enabled")
	assert.Contains(t, statusField.Tag.Get("gorm"), "idx_report_status")

	queryModeField, ok := reportTyp.FieldByName("QueryMode")
	require.True(t, ok)
	assert.Contains(t, queryModeField.Tag.Get("gorm"), "default:sql")

	outputFormatField, ok := reportTyp.FieldByName("OutputFormat")
	require.True(t, ok)
	assert.Contains(t, outputFormatField.Tag.Get("gorm"), "default:markdown")

	scheduleTyp := reflect.TypeOf(ReportSchedule{})
	reportIDField, ok := scheduleTyp.FieldByName("ReportID")
	require.True(t, ok)
	assert.Contains(t, reportIDField.Tag.Get("gorm"), "primaryKey")

	channelIDsField, ok := scheduleTyp.FieldByName("ChannelIDs")
	require.True(t, ok)
	assert.Contains(t, channelIDsField.Tag.Get("gorm"), "type:text")

	executionTyp := reflect.TypeOf(ReportExecution{})
	channelResultsField, ok := executionTyp.FieldByName("ChannelResults")
	require.True(t, ok)
	assert.Contains(t, channelResultsField.Tag.Get("gorm"), "type:longtext")

	accelerationTyp := reflect.TypeOf(ReportAcceleration{})
	reportIDField2, ok := accelerationTyp.FieldByName("ReportID")
	require.True(t, ok)
	assert.Contains(t, reportIDField2.Tag.Get("gorm"), "uniqueIndex:uniq_report_acceleration_report_id")

	statusField2, ok := accelerationTyp.FieldByName("Status")
	require.True(t, ok)
	assert.Contains(t, statusField2.Tag.Get("gorm"), "default:pending")
	assert.Contains(t, statusField2.Tag.Get("gorm"), "idx_report_acceleration_status")
}
