package report

import (
	"testing"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestBuildReportQuery(t *testing.T) {
	now := time.Date(2026, 3, 31, 18, 0, 0, 0, time.FixedZone("CST", 8*3600))
	tests := []struct {
		name    string
		req     view.ReqReportBuilder
		wantSQL []string
		wantErr string
	}{
		{
			name: "builds one hour sql with yesterday comparison",
			req: view.ReqReportBuilder{
				Database:  "default",
				Table:     "logs",
				TimeField: "event_time",
				TimeRange: "1h",
				Where:     "level = 'error'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
			wantSQL: []string{
				"WITH toDateTime('2026-03-31 17:00:00') AS current_start",
				"toDateTime('2026-03-30 17:00:00') AS previous_start",
				"`default`.`logs`",
				"level = 'error'",
				"ratio_vs_yesterday",
				"count(*) AS current_value",
			},
		},
		{
			name: "builds one day sql without optional where clause",
			req: view.ReqReportBuilder{
				Database:  "default",
				Table:     "logs",
				TimeField: "event_time",
				TimeRange: "1d",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
			wantSQL: []string{
				"toDateTime('2026-03-30 18:00:00') AS current_start",
				"toDateTime('2026-03-29 18:00:00') AS previous_start",
				"count(*) AS current_value",
			},
		},
		{
			name: "rejects multi statement where",
			req: view.ReqReportBuilder{
				Database:  "default",
				Table:     "logs",
				TimeField: "event_time",
				TimeRange: "1h",
				Where:     "level = 'error'; drop table logs",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
			wantErr: "where 不能为空或包含非法多语句",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildReportQuery(tt.req, now)
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Equal(t, tt.wantErr, err.Error())
				return
			}
			require.NoError(t, err)
			for _, token := range tt.wantSQL {
				assert.Contains(t, got, token)
			}
		})
	}
}

func TestResolveReportBuilder(t *testing.T) {
	now := time.Date(2026, 3, 31, 18, 0, 0, 0, time.FixedZone("CST", 8*3600))
	builder := view.ReqReportBuilder{
		InstanceID: 1,
		Database:   "default",
		Table:      "logs",
		TimeField:  "event_time",
		TimeRange:  "1h",
		Where:      "level = 'error'",
		Metrics: []view.ReqReportMetric{
			{Key: "count", Label: "总量"},
		},
	}
	queryText, err := buildReportQuery(builder, now)
	require.NoError(t, err)

	t.Run("prefers stored builder config", func(t *testing.T) {
		report := dbmodel.Report{BuilderConfig: marshalReportBuilder(&builder)}
		resolved := resolveReportBuilder(report)
		require.NotNil(t, resolved)
		assert.Equal(t, builder.InstanceID, resolved.InstanceID)
		assert.Equal(t, builder.Database, resolved.Database)
		assert.Len(t, resolved.Metrics, 1)
	})

	t.Run("infers builder from generated query", func(t *testing.T) {
		report := dbmodel.Report{QueryText: queryText}
		resolved := resolveReportBuilder(report)
		require.NotNil(t, resolved)
		assert.Equal(t, "default", resolved.Database)
		assert.Equal(t, "logs", resolved.Table)
		assert.Equal(t, "event_time", resolved.TimeField)
		assert.Equal(t, "1h", resolved.TimeRange)
		assert.Equal(t, "level = 'error'", resolved.Where)
		if assert.Len(t, resolved.Metrics, 1) {
			assert.Equal(t, "count", resolved.Metrics[0].Key)
			assert.Equal(t, "总量", resolved.Metrics[0].Label)
		}
	})
}
