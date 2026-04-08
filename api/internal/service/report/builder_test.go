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
				"anyIf(metric_value, window_name = 'current') AS current_value",
				"anyIf(metric_value, window_name = 'previous') AS previous_value",
				"toFloat64(count(*)) AS metric_value",
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
				"toDateTime('2026-03-30 00:00:00') AS current_start",
				"toDateTime('2026-03-29 00:00:00') AS previous_start",
				"toDateTime('2026-03-31 00:00:00') AS current_end",
				"toFloat64(count(*)) AS metric_value",
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

func TestQuoteTableWithoutDatabase(t *testing.T) {
	assert.Equal(t, "`cv_report_agg_8`", quoteTable("", "cv_report_agg_8"))
}

func TestReportComparisonWindowForOneDayUsesCalendarDay(t *testing.T) {
	now := time.Date(2026, 4, 8, 16, 30, 0, 0, time.FixedZone("CST", 8*3600))
	currentStart, currentEnd, previousStart, previousEnd, err := reportComparisonWindow("1d", now)
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 4, 7, 0, 0, 0, 0, now.Location()), currentStart)
	assert.Equal(t, time.Date(2026, 4, 8, 0, 0, 0, 0, now.Location()), currentEnd)
	assert.Equal(t, time.Date(2026, 4, 6, 0, 0, 0, 0, now.Location()), previousStart)
	assert.Equal(t, time.Date(2026, 4, 7, 0, 0, 0, 0, now.Location()), previousEnd)
}

func TestBuildReportQueryOptimizesCustomAggregateWithSingleScan(t *testing.T) {
	queryText, err := buildReportQuery(view.ReqReportBuilder{
		Database:  "default",
		Table:     "logs",
		TimeField: "event_time",
		TimeRange: "1h",
		Where:     "level = 'error'",
		Metrics: []view.ReqReportMetric{
			{Key: "custom", Label: "平均耗时", Expression: "avg(duration)"},
		},
	}, time.Date(2026, 3, 31, 18, 0, 0, 0, time.FixedZone("CST", 8*3600)))

	require.NoError(t, err)
	assert.Contains(t, queryText, "toFloat64(avg(duration)) AS metric_value")
	assert.Contains(t, queryText, "anyIf(metric_value, window_name = 'current') AS current_value")
	assert.Contains(t, queryText, "WHERE ((event_time >= current_start AND event_time < current_end) OR (event_time >= previous_start AND event_time < previous_end))")
	assert.NotContains(t, queryText, "(SELECT toFloat64(avg(duration)) FROM `default`.`logs`")
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

func TestParseStoredReportBuilderWrapsLegacyBuilderIntoDefaultBlock(t *testing.T) {
	raw := `{"instanceId":1,"database":"logger","table":"logs","timeField":"event_time","timeRange":"1d","where":"level='error'","metrics":[{"key":"count","label":"总量"}]}`

	builder := parseStoredReportBuilder(raw)
	if assert.NotNil(t, builder) {
		assert.Equal(t, 1, builder.InstanceID)
		assert.Len(t, builder.Blocks, 1)
		assert.Equal(t, "default", builder.Blocks[0].Key)
		assert.Equal(t, "默认条件块", builder.Blocks[0].Label)
		assert.Equal(t, "level='error'", builder.Blocks[0].Where)
		assert.Len(t, builder.Blocks[0].Metrics, 1)
		assert.Equal(t, "总量", builder.Blocks[0].Metrics[0].Label)
	}
}

func TestParseStoredReportBuilderSupportsBlocks(t *testing.T) {
	raw := `{"instanceId":1,"database":"logger","table":"logs","timeField":"event_time","timeRange":"1d","blocks":[{"key":"debug","label":"Debug 日志","where":"lv='debug'","metrics":[{"key":"count","label":"总量"}]},{"key":"info","label":"Info 日志","where":"lv='info'","metrics":[{"key":"custom","label":"平均耗时","expression":"avg(duration)"}]}]}`

	builder := parseStoredReportBuilder(raw)
	if assert.NotNil(t, builder) {
		assert.Len(t, builder.Blocks, 2)
		assert.Equal(t, "debug", builder.Blocks[0].Key)
		assert.Equal(t, "Debug 日志", builder.Blocks[0].Label)
		assert.Equal(t, "info", builder.Blocks[1].Key)
		assert.Equal(t, "avg(duration)", builder.Blocks[1].Metrics[0].Expression)
	}
}

func TestBuildReportQueryRejectsTooManyBlocks(t *testing.T) {
	blocks := make([]view.ReqReportBlock, 0, 6)
	for i := 0; i < 6; i++ {
		blocks = append(blocks, view.ReqReportBlock{
			Key:   "block",
			Label: "条件块",
			Where: "",
			Metrics: []view.ReqReportMetric{
				{Key: "count", Label: "总量"},
			},
		})
	}

	_, err := buildReportQuery(view.ReqReportBuilder{
		InstanceID: 1,
		Database:   "logger",
		Table:      "logs",
		TimeField:  "event_time",
		TimeRange:  "1d",
		Blocks:     blocks,
	}, time.Date(2026, 4, 2, 9, 0, 0, 0, time.Local))

	require.Error(t, err)
	assert.Contains(t, err.Error(), "blocks")
}

func TestBuildReportQuerySupportsMultipleBlocksAndMetrics(t *testing.T) {
	queryText, err := buildReportQuery(view.ReqReportBuilder{
		InstanceID: 1,
		Database:   "logger",
		Table:      "logs",
		TimeField:  "event_time",
		TimeRange:  "1d",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "debug",
				Label: "Debug 日志",
				Where: "lv = 'debug'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
			{
				Key:   "info",
				Label: "Info 日志",
				Where: "lv = 'info'",
				Metrics: []view.ReqReportMetric{
					{Key: "custom", Label: "平均耗时", Expression: "avg(duration)"},
				},
			},
		},
	}, time.Date(2026, 4, 2, 9, 0, 0, 0, time.Local))

	require.NoError(t, err)
	assert.Contains(t, queryText, "AS block_key")
	assert.Contains(t, queryText, "AS block_label")
	assert.Contains(t, queryText, "Debug 日志")
	assert.Contains(t, queryText, "Info 日志")
	assert.Contains(t, queryText, "avg(duration)")
}

func TestBuildReportQuerySupportsTopNMetric(t *testing.T) {
	queryText, err := buildReportQuery(view.ReqReportBuilder{
		InstanceID: 1,
		Database:   "logger",
		Table:      "logs",
		TimeField:  "event_time",
		TimeRange:  "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "error",
				Label: "异常 Pod",
				Where: "level = 'error'",
				Metrics: []view.ReqReportMetric{
					{Key: "topn", Label: "Top3 Pod", GroupBy: "pod", Limit: 3},
				},
			},
		},
	}, time.Date(2026, 4, 2, 9, 0, 0, 0, time.Local))

	require.NoError(t, err)
	assert.Contains(t, queryText, "'topn' AS metric_kind")
	assert.Contains(t, queryText, "toString(pod) AS top_key")
	assert.Contains(t, queryText, "toFloat64(count(*)) AS top_value")
	assert.Contains(t, queryText, "GROUP BY pod")
	assert.Contains(t, queryText, "LIMIT 3")
	assert.NotContains(t, queryText, "row_number() OVER")
	assert.Contains(t, queryText, "ORDER BY block_order, metric_order")
	assert.Contains(t, queryText, "if(metric_kind = 'topn', top_value")
}
