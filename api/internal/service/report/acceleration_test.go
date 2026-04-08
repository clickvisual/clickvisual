package report

import (
	"fmt"
	"testing"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubSourceOperator struct {
	query func(string) ([]map[string]interface{}, error)
}

func (s stubSourceOperator) Databases() ([]string, error)                  { return nil, nil }
func (s stubSourceOperator) Tables(string) ([]string, error)               { return nil, nil }
func (s stubSourceOperator) Columns(string, string) ([]view.Column, error) { return nil, nil }
func (s stubSourceOperator) Exec(string) error                             { return nil }
func (s stubSourceOperator) Query(sql string) ([]map[string]interface{}, error) {
	if s.query == nil {
		return nil, fmt.Errorf("unexpected query: %s", sql)
	}
	return s.query(sql)
}

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
	}, reportAccelerationTopology{}, now)
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
	assert.Contains(t, plan.CreateTableSQL, "bucket_time DateTime('Asia/Shanghai')")
	assert.Contains(t, plan.CreateTableSQL, "group_kind UInt8")
	assert.Contains(t, plan.CreateTableSQL, "group_value String")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `pro_log`.`cv_report_mv_3_1`")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `pro_log`.`cv_report_mv_3_2`")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `pro_log`.`cv_report_mv_3_3`")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "uniqState(toString(`k8s.pod.name`)) AS uniq_state")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "toUInt8(1) AS group_kind")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "ifNull(toString(`container.name`), '') AS group_value")
	assert.Contains(t, plan.BackfillSQL, "INSERT INTO `pro_log`.`cv_report_agg_3`")
	assert.Contains(t, plan.BackfillSQL, "toDateTime('2026-04-06 14:00:00', 'Asia/Shanghai')")
	assert.NotEmpty(t, plan.BuilderFingerprint)
}

func TestBuildReportAccelerationPlanForCluster(t *testing.T) {
	now := time.Date(2026, 4, 8, 10, 0, 0, 0, time.Local)
	plan, err := buildReportAccelerationPlan(9, view.ReqReportBuilder{
		InstanceID: 7,
		Database:   "dev_log",
		Table:      "app_stdout",
		TimeField:  "_time_second_",
		TimeRange:  "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "default",
				Label: "默认条件块",
				Where: "lv='error'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
		},
	}, reportAccelerationTopology{
		UseCluster:       true,
		ClusterName:      "test_cluster",
		SourceLocalTable: "app_stdout_local",
	}, now)
	require.NoError(t, err)
	assert.Equal(t, "cv_report_agg_9", plan.TargetTable)
	assert.Equal(t, "cv_report_agg_9_local", plan.TargetLocalTable)
	assert.Equal(t, "app_stdout_local", plan.SourceLocalTable)
	assert.Contains(t, plan.CreateTableSQL, "CREATE TABLE IF NOT EXISTS `dev_log`.`cv_report_agg_9_local` ON CLUSTER 'test_cluster'")
	assert.Contains(t, plan.CreateTableSQL, "CREATE TABLE IF NOT EXISTS `dev_log`.`cv_report_agg_9` ON CLUSTER 'test_cluster' AS `dev_log`.`cv_report_agg_9_local` ENGINE = Distributed('test_cluster', 'dev_log', 'cv_report_agg_9_local', rand())")
	assert.Contains(t, plan.CreateMaterializedViewSQL, "CREATE MATERIALIZED VIEW IF NOT EXISTS `dev_log`.`cv_report_mv_9_1` ON CLUSTER 'test_cluster' TO `dev_log`.`cv_report_agg_9_local`")
	assert.Contains(t, plan.BackfillSQL, "INSERT INTO `dev_log`.`cv_report_agg_9`")
	assert.Contains(t, plan.BackfillSQL, "FROM `dev_log`.`app_stdout`")
	assert.NotContains(t, plan.BackfillSQL, "FROM `dev_log`.`app_stdout_local`")
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
	assert.Contains(t, query, "toDateTime('2026-04-07 15:00:00', 'Asia/Shanghai')")
	assert.Contains(t, query, "uniqMerge(uniq_state)")
	assert.Contains(t, query, "sum(count_value)")
	assert.Contains(t, query, "group_kind = 1")
	assert.Contains(t, query, "group_kind = 0")
	assert.Contains(t, query, "GROUP BY group_value")
}

func TestPreferredClusterNameIgnoresDefaultAlias(t *testing.T) {
	assert.Equal(t, "default_cluster", preferredClusterName([]string{"default", "default_cluster"}))
}

func TestPreferredClusterNameRejectsRealAmbiguity(t *testing.T) {
	assert.Equal(t, "", preferredClusterName([]string{"cluster_a", "cluster_b"}))
}

func TestResolveClickHouseClusterNameUsesExplicitSelection(t *testing.T) {
	service := &Service{}
	clusterName, useCluster, err := service.resolveClickHouseClusterName(
		dbmodel.BaseInstance{},
		stubSourceOperator{
			query: func(sql string) ([]map[string]interface{}, error) {
				if sql == "SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster" {
					return []map[string]interface{}{
						{"cluster": "default", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "default_cluster", "max_shard_num": int64(2), "max_replica_num": int64(1)},
					}, nil
				}
				return nil, fmt.Errorf("unexpected query: %s", sql)
			},
		},
		"default_cluster",
	)
	require.NoError(t, err)
	assert.True(t, useCluster)
	assert.Equal(t, "default_cluster", clusterName)
}

func TestResolveClickHouseClusterNameUsesSingleModeWhenClusterIsEmpty(t *testing.T) {
	service := &Service{}
	clusterName, useCluster, err := service.resolveClickHouseClusterName(
		dbmodel.BaseInstance{},
		stubSourceOperator{
			query: func(sql string) ([]map[string]interface{}, error) {
				switch sql {
				case "SELECT DISTINCT cluster FROM system.clusters":
					return []map[string]interface{}{
						{"cluster": "default"},
						{"cluster": "default_cluster"},
					}, nil
				case "SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster":
					return []map[string]interface{}{
						{"cluster": "default", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "default_cluster", "max_shard_num": int64(2), "max_replica_num": int64(1)},
					}, nil
				default:
					return nil, fmt.Errorf("unexpected query: %s", sql)
				}
			},
		},
		"",
	)
	require.NoError(t, err)
	assert.False(t, useCluster)
	assert.Empty(t, clusterName)
}

func TestResolveClickHouseClusterNameUsesSingleModeForAmbiguousClusters(t *testing.T) {
	service := &Service{}
	clusterName, useCluster, err := service.resolveClickHouseClusterName(
		dbmodel.BaseInstance{},
		stubSourceOperator{
			query: func(sql string) ([]map[string]interface{}, error) {
				switch sql {
				case "SELECT DISTINCT cluster FROM system.clusters":
					return []map[string]interface{}{
						{"cluster": "cluster_a"},
						{"cluster": "cluster_b"},
					}, nil
				case "SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster":
					return []map[string]interface{}{
						{"cluster": "cluster_a", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "cluster_b", "max_shard_num": int64(2), "max_replica_num": int64(1)},
					}, nil
				default:
					return nil, fmt.Errorf("unexpected query: %s", sql)
				}
			},
		},
		"",
	)
	require.NoError(t, err)
	assert.False(t, useCluster)
	assert.Empty(t, clusterName)
}

func TestResolveClickHouseClusterNameFiltersInternalAliases(t *testing.T) {
	service := &Service{}
	clusterName, useCluster, err := service.resolveClickHouseClusterName(
		dbmodel.BaseInstance{},
		stubSourceOperator{
			query: func(sql string) ([]map[string]interface{}, error) {
				switch sql {
				case "SELECT DISTINCT cluster FROM system.clusters":
					return []map[string]interface{}{
						{"cluster": "test_cluster_two_shards"},
						{"cluster": "test_cluster_two_shards_internal_replication"},
						{"cluster": "test_cluster_two_shards_localhost"},
						{"cluster": "test_unavailable_shard"},
					}, nil
				case "SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster":
					return []map[string]interface{}{
						{"cluster": "test_cluster_two_shards", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "test_cluster_two_shards_internal_replication", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "test_cluster_two_shards_localhost", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "test_unavailable_shard", "max_shard_num": int64(2), "max_replica_num": int64(1)},
					}, nil
				default:
					return nil, fmt.Errorf("unexpected query: %s", sql)
				}
			},
		},
		"",
	)
	require.NoError(t, err)
	assert.False(t, useCluster)
	assert.Empty(t, clusterName)
}

func TestListAvailableClickHouseClustersFiltersInvalidCandidates(t *testing.T) {
	clusters, err := listAvailableClickHouseClusters(
		dbmodel.BaseInstance{},
		stubSourceOperator{
			query: func(sql string) ([]map[string]interface{}, error) {
				if sql == "SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster" {
					return []map[string]interface{}{
						{"cluster": "test_cluster_two_shards", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "test_cluster_two_shards_internal_replication", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "test_cluster_two_shards_localhost", "max_shard_num": int64(2), "max_replica_num": int64(1)},
						{"cluster": "test_unavailable_shard", "max_shard_num": int64(2), "max_replica_num": int64(1)},
					}, nil
				}
				return nil, fmt.Errorf("unexpected query: %s", sql)
			},
		},
	)
	require.NoError(t, err)
	assert.Equal(t, []string{"test_cluster_two_shards"}, clusters)
}

func TestListAvailableClickHouseClustersExcludesSingleNodeCluster(t *testing.T) {
	clusters, err := listAvailableClickHouseClusters(
		dbmodel.BaseInstance{},
		stubSourceOperator{
			query: func(sql string) ([]map[string]interface{}, error) {
				if sql == "SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster" {
					return []map[string]interface{}{
						{"cluster": "shimodev", "max_shard_num": int64(1), "max_replica_num": int64(1)},
					}, nil
				}
				return nil, fmt.Errorf("unexpected query: %s", sql)
			},
		},
	)
	require.NoError(t, err)
	assert.Empty(t, clusters)
}
