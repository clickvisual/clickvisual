package report

import (
	"testing"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildAccelerationFilterSQL(t *testing.T) {
	filter, err := buildAccelerationFilterSQL(view.ReqReportBuilder{
		Blocks: []view.ReqReportBlock{
			{Key: "error", Where: "level='error'"},
			{Key: "warn", Where: "level='warn'"},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, "(level='error') OR (level='warn')", filter)
}

func TestBuildAccelerationFilterSQLWithEmptyBlockBecomesAllData(t *testing.T) {
	filter, err := buildAccelerationFilterSQL(view.ReqReportBuilder{
		Blocks: []view.ReqReportBlock{
			{Key: "all", Where: ""},
			{Key: "debug", Where: "lv='debug'"},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, "1 = 1", filter)
}

func TestBuildReportAccelerationPlan(t *testing.T) {
	now := time.Date(2026, 4, 7, 15, 0, 0, 0, time.Local)
	plan, err := buildReportAccelerationPlan(3, view.ReqReportBuilder{
		InstanceID: 7,
		Database:   "pro_log",
		Table:      "app_stdout",
		TimeField:  "_time_second_",
		TimeRange:  "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "v2",
				Label: "v2",
				Where: "msg='repair-docs-init'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
					{Key: "custom", Label: "去重 Pod 数", Expression: "uniq(`k8s.pod.name`)"},
					{Key: "topn", Label: "Top3 容器", GroupBy: "container.name", Limit: 3},
				},
			},
		},
	}, now)
	require.NoError(t, err)
	assert.Equal(t, 3, plan.ReportID)
	assert.Equal(t, 7, plan.InstanceID)
	assert.Equal(t, "cv_report_agg_3", plan.TargetTable)
	assert.Equal(t, "cv_report_mv_3_1,cv_report_mv_3_2,cv_report_mv_3_3", plan.MVName)
	assert.Equal(t, []string{"cv_report_mv_3_1", "cv_report_mv_3_2", "cv_report_mv_3_3"}, plan.MVNames)
	assert.Equal(t, "pro_log", plan.SourceDatabase)
	assert.Equal(t, "app_stdout", plan.SourceTable)
	assert.Equal(t, "(msg='repair-docs-init')", plan.FilterSQL)
	assert.Equal(t, now.Add(-25*time.Hour), plan.BackfillStart)
	assert.Equal(t, now, plan.BackfillEnd)
	assert.Contains(t, plan.CreateTableSQL, "CREATE TABLE IF NOT EXISTS `pro_log`.`cv_report_agg_3`")
	assert.Contains(t, plan.CreateTableSQL, "ENGINE = AggregatingMergeTree")
	assert.Contains(t, plan.CreateTableSQL, "group_kind UInt8")
	assert.Contains(t, plan.CreateTableSQL, "group_value String")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `pro_log`.`cv_report_mv_3_1`")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `pro_log`.`cv_report_mv_3_2`")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `pro_log`.`cv_report_mv_3_3`")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "uniqState(toString(`k8s.pod.name`)) AS uniq_state")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "toUInt8(1) AS group_kind")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "ifNull(toString(`container.name`), '') AS group_value")
	assert.Contains(t, plan.BackfillSQL, "INSERT INTO `pro_log`.`cv_report_agg_3`")
	assert.Contains(t, plan.BackfillSQL, "toDateTime('2026-04-06 14:00:00')")
	assert.NotEmpty(t, plan.BuilderFingerprint)
}

func TestBuildAcceleratedReportQuery(t *testing.T) {
	query, err := buildAcceleratedReportQuery(dbmodel.Report{
		BaseModel:     dbmodel.BaseModel{ID: 8},
		TemplateKey:   "report-builder-default",
		BuilderConfig: `{"instanceId":1,"database":"dev_log","table":"app_stdout","timeField":"_time_second_","timeRange":"1h","blocks":[{"key":"default","label":"pod 报错统计","where":"lv='error'","metrics":[{"key":"count","label":"总量"},{"key":"custom","label":"去重 Pod 数","expression":"uniq(` + "`k8s.pod.name`" + `)"}]},{"key":"default_copy_2","label":"pod debug 统计","where":"lv='debug'","metrics":[{"key":"topn","label":"Top3 容器","groupBy":"container.name","limit":3}]}]}`,
	}, dbmodel.ReportAcceleration{
		SourceDatabase: "dev_log",
		TargetTable:    "cv_report_agg_8",
		Status:         dbmodel.ReportAccelerationStatusReady,
	}, time.Date(2026, 4, 7, 16, 0, 0, 0, time.Local))
	require.NoError(t, err)
	assert.Contains(t, query, "FROM `dev_log`.`cv_report_agg_8`")
	assert.Contains(t, query, "uniqMerge(uniq_state)")
	assert.Contains(t, query, "sum(count_value)")
	assert.Contains(t, query, "group_kind = 1")
	assert.Contains(t, query, "group_kind = 0")
	assert.Contains(t, query, "GROUP BY group_value")
}
