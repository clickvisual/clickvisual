package report

import (
	"testing"

	"github.com/stretchr/testify/assert"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestReportModels_TableName(t *testing.T) {
	assert.Equal(t, "cv_report", (&dbmodel.Report{}).TableName())
	assert.Equal(t, "cv_report_schedule", (&dbmodel.ReportSchedule{}).TableName())
	assert.Equal(t, "cv_report_execution", (&dbmodel.ReportExecution{}).TableName())
}
