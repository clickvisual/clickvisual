package report

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	sourcesvc "github.com/clickvisual/clickvisual/api/internal/service/source"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type reportAccelerationPlan struct {
	ReportID                   int
	InstanceID                 int
	SourceDatabase             string
	SourceTable                string
	SourceLocalTable           string
	SourceTimeField            string
	TargetTable                string
	TargetLocalTable           string
	MVName                     string
	MVNames                    []string
	ClusterName                string
	UseCluster                 bool
	FilterSQL                  string
	BuilderFingerprint         string
	BackfillStart              time.Time
	BackfillEnd                time.Time
	CreateTableSQL             string
	CreateTableSQLs            []string
	CreateMaterializedViewSQL  string
	CreateMaterializedViewSQLs []string
	BackfillSQL                string
	DropMaterializedViewSQL    string
	DropTargetTableSQL         string
	TimeBucketExpression       string
	TTLDays                    int
}

type aggregationMetricKind string

const (
	aggregationMetricCount aggregationMetricKind = "count"
	aggregationMetricSum   aggregationMetricKind = "sum"
	aggregationMetricUniq  aggregationMetricKind = "uniq"
	aggregationMetricAvg   aggregationMetricKind = "avg"
	aggregationMetricTopN  aggregationMetricKind = "topn"
)

type parsedAggregationMetric struct {
	Kind     aggregationMetricKind
	Field    string
	Label    string
	GroupBy  string
	Limit    int
	BlockKey string
}

var reportAggregationMetricExprPattern = regexp.MustCompile(`^(count\(\*\)|sum\(([^)]+)\)|uniq\(([^)]+)\)|avg\(([^)]+)\))$`)
var reportDistributedEnginePattern = regexp.MustCompile(`Distributed\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,`)

var reportAccelerationSchemaInit sync.Once
var reportAccelerationSchemaErr error

const reportTimeZoneName = "Asia/Shanghai"

type reportAccelerationTopology struct {
	UseCluster       bool
	ClusterName      string
	SourceLocalTable string
	TargetLocalTable string
}

func buildReportAccelerationPlan(reportID int, builder view.ReqReportBuilder, topology reportAccelerationTopology, now time.Time) (reportAccelerationPlan, error) {
	if reportID <= 0 {
		return reportAccelerationPlan{}, fmt.Errorf("reportId 不能为空")
	}
	builder = sanitizeReportBuilder(builder)
	if strings.TrimSpace(builder.Database) == "" || strings.TrimSpace(builder.Table) == "" || strings.TrimSpace(builder.TimeField) == "" {
		return reportAccelerationPlan{}, fmt.Errorf("database、table、timeField 不能为空")
	}
	duration, err := reportDuration(builder.TimeRange)
	if err != nil {
		return reportAccelerationPlan{}, err
	}
	filterSQL, err := buildAccelerationFilterSQL(builder)
	if err != nil {
		return reportAccelerationPlan{}, err
	}
	fingerprint, err := buildAccelerationFingerprint(builder)
	if err != nil {
		return reportAccelerationPlan{}, err
	}
	targetTable := fmt.Sprintf("cv_report_agg_%d", reportID)
	targetLocalTable := targetTable
	if topology.UseCluster {
		targetLocalTable = fmt.Sprintf("%s_local", targetTable)
	}
	backfillStart := now.Add(-(24*time.Hour + duration))
	backfillEnd := now
	targetRef := quoteTable(builder.Database, targetTable)
	targetLocalRef := quoteTable(builder.Database, targetLocalTable)
	selectBodies, err := buildAggregationSelectBodies(reportID, builder, topology, false, time.Time{}, time.Time{})
	if err != nil {
		return reportAccelerationPlan{}, err
	}
	backfillSelectBody, err := buildAggregationBackfillSelectBody(builder, topology, true, backfillStart, backfillEnd)
	if err != nil {
		return reportAccelerationPlan{}, err
	}
	timeBucketExpression, ttlDays := aggregationTimeBucket(builder.TimeRange)
	mvNames := make([]string, 0, len(selectBodies))
	mvSQLs := make([]string, 0, len(selectBodies))
	createTableSQLs := make([]string, 0, 2)
	clusterSuffix := ""
	if topology.UseCluster {
		clusterSuffix = fmt.Sprintf(" ON CLUSTER '%s'", escapeSQLString(topology.ClusterName))
	}
	localEngineSQL := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s%s (bucket_time DateTime('%s'), block_key String, metric_name String, group_kind UInt8, group_value String, sum_value Float64, count_value UInt64, uniq_state AggregateFunction(uniq, String)) ENGINE = AggregatingMergeTree PARTITION BY toDate(bucket_time) ORDER BY (bucket_time, block_key, metric_name, group_kind, group_value) TTL bucket_time + INTERVAL %d DAY", targetLocalRef, clusterSuffix, reportTimeZoneName, ttlDays)
	createTableSQLs = append(createTableSQLs, localEngineSQL)
	if topology.UseCluster {
		createTableSQLs = append(createTableSQLs, fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s%s AS %s ENGINE = Distributed('%s', '%s', '%s', rand())", targetRef, clusterSuffix, targetLocalRef, escapeSQLString(topology.ClusterName), escapeSQLString(builder.Database), escapeSQLString(targetLocalTable)))
	}
	for _, item := range selectBodies {
		mvNames = append(mvNames, item.MVName)
		mvSQLs = append(mvSQLs, fmt.Sprintf("CREATE MATERIALIZED VIEW IF NOT EXISTS %s%s TO %s AS %s", quoteTable(builder.Database, item.MVName), clusterSuffix, targetLocalRef, item.SelectSQL))
	}

	return reportAccelerationPlan{
		ReportID:                   reportID,
		InstanceID:                 builder.InstanceID,
		SourceDatabase:             builder.Database,
		SourceTable:                builder.Table,
		SourceLocalTable:           topology.SourceLocalTable,
		SourceTimeField:            builder.TimeField,
		TargetTable:                targetTable,
		TargetLocalTable:           targetLocalTable,
		MVName:                     strings.Join(mvNames, ","),
		MVNames:                    mvNames,
		ClusterName:                topology.ClusterName,
		UseCluster:                 topology.UseCluster,
		FilterSQL:                  filterSQL,
		BuilderFingerprint:         fingerprint,
		BackfillStart:              backfillStart,
		BackfillEnd:                backfillEnd,
		CreateTableSQL:             strings.Join(createTableSQLs, ";\n"),
		CreateTableSQLs:            createTableSQLs,
		CreateMaterializedViewSQL:  strings.Join(mvSQLs, ";\n"),
		CreateMaterializedViewSQLs: mvSQLs,
		BackfillSQL:                fmt.Sprintf("INSERT INTO %s %s", targetRef, backfillSelectBody),
		DropMaterializedViewSQL:    "",
		DropTargetTableSQL:         fmt.Sprintf("DROP TABLE IF EXISTS %s", targetRef),
		TimeBucketExpression:       timeBucketExpression,
		TTLDays:                    ttlDays,
	}, nil
}

func buildAccelerationFilterSQL(builder view.ReqReportBuilder) (string, error) {
	blocks := normalizeReportBlocks(builder)
	if len(blocks) == 0 {
		return "1 = 1", nil
	}
	filters := make([]string, 0, len(blocks))
	for _, block := range blocks {
		whereClause, err := buildWhereClause(block.Where)
		if err != nil {
			return "", err
		}
		if strings.TrimSpace(whereClause) == "" {
			return "1 = 1", nil
		}
		filters = append(filters, strings.TrimSpace(strings.TrimPrefix(whereClause, " AND ")))
	}
	if len(filters) == 0 {
		return "1 = 1", nil
	}
	return strings.Join(filters, " OR "), nil
}

func buildAccelerationFingerprint(builder view.ReqReportBuilder) (string, error) {
	payload := struct {
		InstanceID int                    `json:"instanceId"`
		Cluster    string                 `json:"cluster"`
		Database   string                 `json:"database"`
		Table      string                 `json:"table"`
		TimeField  string                 `json:"timeField"`
		TimeRange  string                 `json:"timeRange"`
		Blocks     []view.ReqReportBlock  `json:"blocks"`
		Metrics    []view.ReqReportMetric `json:"metrics"`
	}{
		InstanceID: builder.InstanceID,
		Cluster:    strings.TrimSpace(builder.Cluster),
		Database:   builder.Database,
		Table:      builder.Table,
		TimeField:  builder.TimeField,
		TimeRange:  builder.TimeRange,
		Blocks:     normalizeReportBlocks(builder),
		Metrics:    builder.Metrics,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	sum := sha1.Sum(raw)
	return hex.EncodeToString(sum[:]), nil
}

func quoteIdentifier(value string) string {
	return fmt.Sprintf("`%s`", strings.ReplaceAll(value, "`", "``"))
}

func aggregationTimeBucket(timeRange string) (string, int) {
	switch strings.TrimSpace(timeRange) {
	case "1d":
		return "toStartOfInterval(%s, INTERVAL 1 HOUR)", 7
	default:
		return "toStartOfInterval(%s, INTERVAL 5 MINUTE)", 3
	}
}

type aggregationSelectPart struct {
	MVName    string
	SelectSQL string
}

func buildAggregationSelectBodies(reportID int, builder view.ReqReportBuilder, topology reportAccelerationTopology, restrictTime bool, start time.Time, end time.Time) ([]aggregationSelectPart, error) {
	blocks := normalizeReportBlocks(builder)
	sourceTable := builder.Table
	if topology.UseCluster && strings.TrimSpace(topology.SourceLocalTable) != "" {
		sourceTable = topology.SourceLocalTable
	}
	sourceRef := quoteTable(builder.Database, sourceTable)
	timeField := quoteIdentifier(builder.TimeField)
	bucketTpl, _ := aggregationTimeBucket(builder.TimeRange)
	bucketExpr := fmt.Sprintf(bucketTpl, timeField)
	parts := make([]aggregationSelectPart, 0)
	mvIndex := 0
	for _, block := range blocks {
		whereClause, err := buildWhereClause(block.Where)
		if err != nil {
			return nil, err
		}
		timeClause := ""
		if restrictTime {
			timeClause = fmt.Sprintf(" AND %s >= toDateTime('%s', '%s') AND %s < toDateTime('%s', '%s')", timeField, start.Format("2006-01-02 15:04:05"), reportTimeZoneName, timeField, end.Format("2006-01-02 15:04:05"), reportTimeZoneName)
		}
		blockKey := strings.TrimSpace(block.Key)
		if blockKey == "" {
			blockKey = "default"
		}
		for _, metric := range block.Metrics {
			parsed, err := parseAggregationMetric(blockKey, metric)
			if err != nil {
				return nil, err
			}
			mvIndex += 1
			mvName := fmt.Sprintf("cv_report_mv_%d_%d", reportID, mvIndex)
			switch parsed.Kind {
			case aggregationMetricCount:
				parts = append(parts, aggregationSelectPart{MVName: mvName, SelectSQL: fmt.Sprintf(
					"SELECT %s AS bucket_time, '%s' AS block_key, '%s' AS metric_name, toUInt8(0) AS group_kind, '' AS group_value, toFloat64(0) AS sum_value, toUInt64(count()) AS count_value, uniqState(toString('')) AS uniq_state FROM %s WHERE 1 = 1%s%s GROUP BY bucket_time",
					bucketExpr, escapeSQLString(parsed.BlockKey), escapeSQLString(parsed.Label), sourceRef, timeClause, whereClause,
				)})
			case aggregationMetricSum:
				field := quoteIdentifier(parsed.Field)
				parts = append(parts, aggregationSelectPart{MVName: mvName, SelectSQL: fmt.Sprintf(
					"SELECT %s AS bucket_time, '%s' AS block_key, '%s' AS metric_name, toUInt8(0) AS group_kind, '' AS group_value, toFloat64(sum(toFloat64(%s))) AS sum_value, toUInt64(0) AS count_value, uniqState(toString('')) AS uniq_state FROM %s WHERE 1 = 1%s%s GROUP BY bucket_time",
					bucketExpr, escapeSQLString(parsed.BlockKey), escapeSQLString(parsed.Label), field, sourceRef, timeClause, whereClause,
				)})
			case aggregationMetricAvg:
				field := quoteIdentifier(parsed.Field)
				parts = append(parts, aggregationSelectPart{MVName: mvName, SelectSQL: fmt.Sprintf(
					"SELECT %s AS bucket_time, '%s' AS block_key, '%s' AS metric_name, toUInt8(0) AS group_kind, '' AS group_value, toFloat64(sum(toFloat64(%s))) AS sum_value, toUInt64(count()) AS count_value, uniqState(toString('')) AS uniq_state FROM %s WHERE 1 = 1%s%s GROUP BY bucket_time",
					bucketExpr, escapeSQLString(parsed.BlockKey), escapeSQLString(parsed.Label), field, sourceRef, timeClause, whereClause,
				)})
			case aggregationMetricUniq:
				field := quoteIdentifier(parsed.Field)
				parts = append(parts, aggregationSelectPart{MVName: mvName, SelectSQL: fmt.Sprintf(
					"SELECT %s AS bucket_time, '%s' AS block_key, '%s' AS metric_name, toUInt8(0) AS group_kind, '' AS group_value, toFloat64(0) AS sum_value, toUInt64(0) AS count_value, uniqState(toString(%s)) AS uniq_state FROM %s WHERE 1 = 1%s%s GROUP BY bucket_time",
					bucketExpr, escapeSQLString(parsed.BlockKey), escapeSQLString(parsed.Label), field, sourceRef, timeClause, whereClause,
				)})
			case aggregationMetricTopN:
				field := quoteIdentifier(parsed.GroupBy)
				parts = append(parts, aggregationSelectPart{MVName: mvName, SelectSQL: fmt.Sprintf(
					"SELECT %s AS bucket_time, '%s' AS block_key, '%s' AS metric_name, toUInt8(1) AS group_kind, ifNull(toString(%s), '') AS group_value, toFloat64(0) AS sum_value, toUInt64(count()) AS count_value, uniqState(toString('')) AS uniq_state FROM %s WHERE 1 = 1%s%s GROUP BY bucket_time, group_value",
					bucketExpr, escapeSQLString(parsed.BlockKey), escapeSQLString(parsed.Label), field, sourceRef, timeClause, whereClause,
				)})
			}
		}
	}
	return parts, nil
}

func buildAggregationBackfillSelectBody(builder view.ReqReportBuilder, topology reportAccelerationTopology, restrictTime bool, start time.Time, end time.Time) (string, error) {
	backfillTopology := topology
	backfillTopology.SourceLocalTable = ""
	parts, err := buildAggregationSelectBodies(0, builder, backfillTopology, restrictTime, start, end)
	if err != nil {
		return "", err
	}
	selectSQLs := make([]string, 0, len(parts))
	for _, item := range parts {
		selectSQLs = append(selectSQLs, item.SelectSQL)
	}
	return strings.Join(selectSQLs, " UNION ALL "), nil
}

func parseAggregationMetric(blockKey string, metric view.ReqReportMetric) (parsedAggregationMetric, error) {
	label := strings.TrimSpace(metric.Label)
	if label == "" {
		label = metric.Key
	}
	key := strings.TrimSpace(strings.ToLower(metric.Key))
	switch key {
	case "", "count":
		return parsedAggregationMetric{Kind: aggregationMetricCount, Label: label, BlockKey: blockKey}, nil
	case "topn":
		groupBy, limit, err := topNMetricConfig(metric)
		if err != nil {
			return parsedAggregationMetric{}, err
		}
		return parsedAggregationMetric{Kind: aggregationMetricTopN, Label: label, GroupBy: normalizeFieldName(groupBy), Limit: limit, BlockKey: blockKey}, nil
	case "custom":
		expr := strings.TrimSpace(strings.ToLower(metric.Expression))
		matches := reportAggregationMetricExprPattern.FindStringSubmatch(expr)
		if len(matches) == 0 {
			return parsedAggregationMetric{}, fmt.Errorf("unsupported aggregation expression: %s", metric.Expression)
		}
		switch {
		case matches[1] == "count(*)":
			return parsedAggregationMetric{Kind: aggregationMetricCount, Label: label, BlockKey: blockKey}, nil
		case matches[2] != "":
			return parsedAggregationMetric{Kind: aggregationMetricSum, Label: label, Field: normalizeFieldName(matches[2]), BlockKey: blockKey}, nil
		case matches[3] != "":
			return parsedAggregationMetric{Kind: aggregationMetricUniq, Label: label, Field: normalizeFieldName(matches[3]), BlockKey: blockKey}, nil
		case matches[4] != "":
			return parsedAggregationMetric{Kind: aggregationMetricAvg, Label: label, Field: normalizeFieldName(matches[4]), BlockKey: blockKey}, nil
		}
	}
	return parsedAggregationMetric{}, fmt.Errorf("unsupported metric: %s", metric.Key)
}

func buildAcceleratedReportQuery(report dbmodel.Report, acceleration dbmodel.ReportAcceleration, now time.Time) (string, error) {
	builder := resolveReportBuilder(report)
	if builder == nil {
		return "", fmt.Errorf("报表 builder 不存在")
	}
	currentStart, currentEnd, previousStart, previousEnd, err := reportComparisonWindow(builder.TimeRange, now)
	if err != nil {
		return "", err
	}
	tableRef := quoteTable(acceleration.SourceDatabase, acceleration.TargetTable)
	parts := make([]string, 0)
	for blockIndex, block := range normalizeReportBlocks(*builder) {
		blockKey := strings.TrimSpace(block.Key)
		if blockKey == "" {
			blockKey = "default"
		}
		blockLabel := strings.TrimSpace(block.Label)
		if blockLabel == "" {
			blockLabel = blockKey
		}
		for metricIndex, metric := range block.Metrics {
			parsed, err := parseAggregationMetric(blockKey, metric)
			if err != nil {
				return "", err
			}
			switch parsed.Kind {
			case aggregationMetricTopN:
				parts = append(parts, fmt.Sprintf(
					"SELECT %d AS block_order, %d AS metric_order, 0 AS item_order, 'topn' AS metric_kind, '%s' AS block_key, '%s' AS block_label, '%s' AS metric_name, CAST(NULL AS Nullable(Float64)) AS current_value, CAST(NULL AS Nullable(Float64)) AS previous_value, top_key, top_value FROM (SELECT group_value AS top_key, toFloat64(sum(count_value)) AS top_value FROM %s WHERE bucket_time >= current_start AND bucket_time < current_end AND block_key = '%s' AND metric_name = '%s' AND group_kind = 1 GROUP BY group_value ORDER BY top_value DESC, top_key ASC LIMIT %d)",
					blockIndex, metricIndex, escapeSQLString(blockKey), escapeSQLString(blockLabel), escapeSQLString(parsed.Label), tableRef, escapeSQLString(blockKey), escapeSQLString(parsed.Label), parsed.Limit,
				))
			default:
				currentValueExpr, previousValueExpr := acceleratedMetricExpressions(parsed)
				parts = append(parts, fmt.Sprintf(
					"SELECT %d AS block_order, %d AS metric_order, 0 AS item_order, 'aggregate' AS metric_kind, '%s' AS block_key, '%s' AS block_label, '%s' AS metric_name, %s AS current_value, %s AS previous_value, CAST(NULL AS Nullable(String)) AS top_key, CAST(NULL AS Nullable(Float64)) AS top_value",
					blockIndex, metricIndex, escapeSQLString(blockKey), escapeSQLString(blockLabel), escapeSQLString(parsed.Label),
					fmt.Sprintf(currentValueExpr, tableRef, escapeSQLString(blockKey), escapeSQLString(parsed.Label)),
					fmt.Sprintf(previousValueExpr, tableRef, escapeSQLString(blockKey), escapeSQLString(parsed.Label)),
				))
			}
		}
	}
	return fmt.Sprintf(
		"WITH toDateTime('%s', '%s') AS current_start, toDateTime('%s', '%s') AS current_end, toDateTime('%s', '%s') AS previous_start, toDateTime('%s', '%s') AS previous_end SELECT block_key, block_label, metric_name, metric_kind, current_value, previous_value, if(metric_kind = 'aggregate' AND previous_value != 0, (current_value - previous_value) / previous_value, NULL) AS ratio_vs_yesterday, top_key, top_value FROM (%s) ORDER BY block_order, metric_order, if(metric_kind = 'topn', 0, item_order), if(metric_kind = 'topn', top_value, CAST(NULL AS Nullable(Float64))) DESC, if(metric_kind = 'topn', top_key, CAST(NULL AS Nullable(String))) ASC",
		currentStart.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		currentEnd.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		previousStart.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		previousEnd.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		strings.Join(parts, " UNION ALL "),
	), nil
}

func acceleratedMetricExpressions(metric parsedAggregationMetric) (string, string) {
	baseFilterCurrent := "FROM %s WHERE bucket_time >= current_start AND bucket_time < current_end AND block_key = '%s' AND metric_name = '%s' AND group_kind = 0"
	baseFilterPrevious := "FROM %s WHERE bucket_time >= previous_start AND bucket_time < previous_end AND block_key = '%s' AND metric_name = '%s' AND group_kind = 0"
	switch metric.Kind {
	case aggregationMetricCount:
		return "(SELECT toFloat64(ifNull(sum(count_value), 0)) " + baseFilterCurrent + ")",
			"(SELECT toFloat64(ifNull(sum(count_value), 0)) " + baseFilterPrevious + ")"
	case aggregationMetricSum:
		return "(SELECT toFloat64(ifNull(sum(sum_value), 0)) " + baseFilterCurrent + ")",
			"(SELECT toFloat64(ifNull(sum(sum_value), 0)) " + baseFilterPrevious + ")"
	case aggregationMetricAvg:
		return "(SELECT if(sum(count_value) = 0, CAST(NULL AS Nullable(Float64)), toFloat64(sum(sum_value) / sum(count_value))) " + baseFilterCurrent + ")",
			"(SELECT if(sum(count_value) = 0, CAST(NULL AS Nullable(Float64)), toFloat64(sum(sum_value) / sum(count_value))) " + baseFilterPrevious + ")"
	case aggregationMetricUniq:
		return "(SELECT toFloat64(uniqMerge(uniq_state)) " + baseFilterCurrent + ")",
			"(SELECT toFloat64(uniqMerge(uniq_state)) " + baseFilterPrevious + ")"
	default:
		return "CAST(NULL AS Nullable(Float64))", "CAST(NULL AS Nullable(Float64))"
	}
}

func (p reportAccelerationPlan) ddlSQL() string {
	return strings.Join([]string{
		p.CreateTableSQL,
		p.CreateMaterializedViewSQL,
		p.BackfillSQL,
	}, ";\n")
}

func (s *Service) ensureReportAccelerationForReport(report dbmodel.Report) error {
	builder := resolveReportBuilder(report)
	if builder == nil {
		return nil
	}
	topology, err := s.resolveReportAccelerationTopology(*builder)
	if err != nil {
		_ = s.upsertReportAccelerationFailure(report.ID, reportAccelerationPlan{}, err)
		return err
	}
	plan, err := buildReportAccelerationPlan(report.ID, *builder, topology, s.now())
	if err != nil {
		_ = s.upsertReportAccelerationFailure(report.ID, plan, err)
		return err
	}
	current, found, err := s.getReportAccelerationByReportIDFromDB(report.ID)
	if err != nil {
		return err
	}
	if found &&
		current.BuilderFingerprint == plan.BuilderFingerprint &&
		current.Status == dbmodel.ReportAccelerationStatusReady &&
		strings.TrimSpace(current.DDLSQL) == strings.TrimSpace(plan.ddlSQL()) {
		return nil
	}
	status := dbmodel.ReportAccelerationStatusProvisioning
	if found {
		status = dbmodel.ReportAccelerationStatusRebuilding
	}
	if err := s.upsertReportAccelerationPlan(report.ID, plan, status, ""); err != nil {
		return err
	}
	if err := s.applyReportAccelerationPlan(plan, current, found); err != nil {
		_ = s.upsertReportAccelerationFailure(report.ID, plan, err)
		return err
	}
	return s.upsertReportAccelerationPlan(report.ID, plan, dbmodel.ReportAccelerationStatusReady, "")
}

func (s *Service) applyReportAccelerationPlan(plan reportAccelerationPlan, current dbmodel.ReportAcceleration, hasCurrent bool) error {
	instance, err := s.getReportClickHouseInstance(plan.InstanceID)
	if err != nil {
		return err
	}
	operator := sourcesvc.Instantiate(&sourcesvc.Source{
		DSN: instance.GetDSN(),
		Typ: dbmodel.SourceTypClickHouse,
	})
	if operator == nil {
		return fmt.Errorf("clickhouse operator 初始化失败")
	}
	if hasCurrent {
		for _, mvName := range splitAccelerationMVNames(current.MVName) {
			dropViewSQL := s.buildClusterAwareDropSQL(current.SourceDatabase, mvName, current.ClusterName)
			if err = operator.Exec(dropViewSQL); err != nil {
				return normalizeClusterDDLError(err, current.ClusterName)
			}
		}
		for _, dropTableSQL := range s.buildAccelerationTargetDropSQLs(current) {
			if err = operator.Exec(dropTableSQL); err != nil {
				return normalizeClusterDDLError(err, current.ClusterName)
			}
		}
	}
	sqlTexts := make([]string, 0, len(plan.CreateTableSQLs)+len(plan.CreateMaterializedViewSQLs)+1)
	sqlTexts = append(sqlTexts, plan.CreateTableSQLs...)
	sqlTexts = append(sqlTexts, plan.CreateMaterializedViewSQLs...)
	sqlTexts = append(sqlTexts, plan.BackfillSQL)
	for _, sqlText := range sqlTexts {
		if err = operator.Exec(sqlText); err != nil {
			return normalizeClusterDDLError(err, plan.ClusterName)
		}
	}
	return nil
}

func (s *Service) cleanupReportAcceleration(acceleration dbmodel.ReportAcceleration) {
	instance, err := s.getReportClickHouseInstance(acceleration.InstanceID)
	if err != nil {
		elog.Warn("cleanup report acceleration", zap.Int("reportId", acceleration.ReportID), zap.Error(err))
		return
	}
	operator := sourcesvc.Instantiate(&sourcesvc.Source{
		DSN: instance.GetDSN(),
		Typ: dbmodel.SourceTypClickHouse,
	})
	if operator == nil {
		return
	}
	for _, mvName := range splitAccelerationMVNames(acceleration.MVName) {
		_ = operator.Exec(s.buildClusterAwareDropSQL(acceleration.SourceDatabase, mvName, acceleration.ClusterName))
	}
	for _, dropTableSQL := range s.buildAccelerationTargetDropSQLs(acceleration) {
		_ = operator.Exec(dropTableSQL)
	}
}

func splitAccelerationMVNames(raw string) []string {
	items := strings.Split(raw, ",")
	names := make([]string, 0, len(items))
	for _, item := range items {
		name := strings.TrimSpace(item)
		if name == "" {
			continue
		}
		names = append(names, name)
	}
	return names
}

func (s *Service) getReportClickHouseInstance(instanceID int) (dbmodel.BaseInstance, error) {
	if instanceID > 0 {
		return dbmodel.InstanceInfo(invoker.Db, instanceID)
	}
	return s.getDefaultClickHouseInstance()
}

func (s *Service) getReportAccelerationByReportIDFromDB(reportID int) (dbmodel.ReportAcceleration, bool, error) {
	if err := ensureReportAccelerationSchema(); err != nil {
		return dbmodel.ReportAcceleration{}, false, err
	}
	var acceleration dbmodel.ReportAcceleration
	err := invoker.Db.Model(&dbmodel.ReportAcceleration{}).Where("report_id = ?", reportID).First(&acceleration).Error
	if err == nil {
		return acceleration, true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return dbmodel.ReportAcceleration{}, false, nil
	}
	return dbmodel.ReportAcceleration{}, false, err
}

func (s *Service) upsertReportAccelerationPlan(reportID int, plan reportAccelerationPlan, status string, errorMessage string) error {
	if err := ensureReportAccelerationSchema(); err != nil {
		return err
	}
	record := dbmodel.ReportAcceleration{
		ReportID:           reportID,
		InstanceID:         plan.InstanceID,
		SourceDatabase:     plan.SourceDatabase,
		SourceTable:        plan.SourceTable,
		SourceLocalTable:   plan.SourceLocalTable,
		SourceTimeField:    plan.SourceTimeField,
		TargetTable:        plan.TargetTable,
		TargetLocalTable:   plan.TargetLocalTable,
		MVName:             plan.MVName,
		ClusterName:        plan.ClusterName,
		FilterSQL:          plan.FilterSQL,
		BuilderFingerprint: plan.BuilderFingerprint,
		BackfillStartAt:    plan.BackfillStart.Unix(),
		BackfillEndAt:      plan.BackfillEnd.Unix(),
		DDLSQL:             plan.ddlSQL(),
		Status:             status,
		ErrorMessage:       errorMessage,
	}
	now := s.now().Unix()
	return invoker.Db.Model(&dbmodel.ReportAcceleration{}).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "report_id"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"instance_id":         record.InstanceID,
			"source_database":     record.SourceDatabase,
			"source_table":        record.SourceTable,
			"source_local_table":  record.SourceLocalTable,
			"source_time_field":   record.SourceTimeField,
			"target_table":        record.TargetTable,
			"target_local_table":  record.TargetLocalTable,
			"mv_name":             record.MVName,
			"cluster_name":        record.ClusterName,
			"filter_sql":          record.FilterSQL,
			"builder_fingerprint": record.BuilderFingerprint,
			"backfill_start_at":   record.BackfillStartAt,
			"backfill_end_at":     record.BackfillEndAt,
			"ddl_sql":             record.DDLSQL,
			"status":              record.Status,
			"error_message":       record.ErrorMessage,
			"utime":               now,
		}),
	}).Create(&record).Error
}

func (s *Service) upsertReportAccelerationFailure(reportID int, plan reportAccelerationPlan, err error) error {
	message := ""
	if err != nil {
		message = err.Error()
	}
	return s.upsertReportAccelerationPlan(reportID, plan, dbmodel.ReportAccelerationStatusError, message)
}

func (s *Service) accelerationReady(reportID int) bool {
	acceleration, found, err := s.getReportAccelerationByReportIDFromDB(reportID)
	return err == nil && found && acceleration.Status == dbmodel.ReportAccelerationStatusReady
}

func ensureReportAccelerationSchema() error {
	reportAccelerationSchemaInit.Do(func() {
		reportAccelerationSchemaErr = invoker.Db.Set("gorm:table_options", "ENGINE=InnoDB").AutoMigrate(&dbmodel.ReportAcceleration{})
	})
	return reportAccelerationSchemaErr
}

func normalizeClusterDDLError(err error, clusterName string) error {
	if err == nil {
		return nil
	}
	message := err.Error()
	if strings.Contains(message, "There is no Zookeeper configuration in server config") {
		if strings.TrimSpace(clusterName) == "" {
			return fmt.Errorf("当前 ClickHouse 实例未配置 ZooKeeper/ClickHouse Keeper，无法执行集群 DDL（ON CLUSTER）")
		}
		return fmt.Errorf("当前 ClickHouse cluster %q 未配置 ZooKeeper/ClickHouse Keeper，无法执行集群 DDL（ON CLUSTER）", clusterName)
	}
	return err
}

func accelerationPreviewMessage(acceleration dbmodel.ReportAcceleration, found bool) string {
	if !found {
		return "报表加速未创建，请先保存报表并等待加速完成。"
	}
	switch acceleration.Status {
	case dbmodel.ReportAccelerationStatusReady:
		return ""
	case dbmodel.ReportAccelerationStatusProvisioning, dbmodel.ReportAccelerationStatusBackfilling, dbmodel.ReportAccelerationStatusRebuilding:
		return fmt.Sprintf("报表加速处理中，当前状态：%s。请稍后再执行预览。", acceleration.Status)
	case dbmodel.ReportAccelerationStatusError:
		if strings.TrimSpace(acceleration.ErrorMessage) != "" {
			return fmt.Sprintf("报表加速失败：%s", acceleration.ErrorMessage)
		}
		return "报表加速失败，请检查加速配置。"
	default:
		return fmt.Sprintf("报表加速未就绪，当前状态：%s。", acceleration.Status)
	}
}

func (s *Service) resolveReportAccelerationTopology(builder view.ReqReportBuilder) (reportAccelerationTopology, error) {
	instance, err := s.getReportClickHouseInstance(builder.InstanceID)
	if err != nil {
		return reportAccelerationTopology{}, err
	}
	operator, err := s.sourceOperatorFromDB(builder.InstanceID)
	if err != nil {
		return reportAccelerationTopology{}, err
	}
	engine, engineFull, err := s.getReportSourceTableEngine(operator, builder.Database, builder.Table)
	if err != nil {
		return reportAccelerationTopology{}, err
	}
	clusterName, useCluster, err := s.resolveClickHouseClusterName(instance, operator, builder.Cluster)
	if err != nil {
		return reportAccelerationTopology{}, err
	}
	topology := reportAccelerationTopology{
		UseCluster:       useCluster,
		ClusterName:      clusterName,
		SourceLocalTable: builder.Table,
		TargetLocalTable: fmt.Sprintf("cv_report_agg_%d_local", 0),
	}
	if !useCluster {
		topology.TargetLocalTable = ""
		return topology, nil
	}
	if strings.EqualFold(strings.TrimSpace(engine), "Distributed") {
		localTable, err := parseDistributedLocalTable(engineFull)
		if err != nil {
			return reportAccelerationTopology{}, fmt.Errorf("源表 %s.%s 是 Distributed，但无法解析本地表: %w", builder.Database, builder.Table, err)
		}
		topology.SourceLocalTable = localTable
	}
	return topology, nil
}

func (s *Service) getReportSourceTableEngine(operator sourcesvc.Operator, database, table string) (string, string, error) {
	rows, err := operator.Query(fmt.Sprintf("SELECT engine, engine_full FROM system.tables WHERE database = '%s' AND name = '%s' LIMIT 1", escapeSQLString(database), escapeSQLString(table)))
	if err != nil {
		return "", "", err
	}
	if len(rows) == 0 {
		return "", "", fmt.Errorf("源表 %s.%s 不存在", database, table)
	}
	engine, _ := rows[0]["engine"].(string)
	engineFull, _ := rows[0]["engine_full"].(string)
	return engine, engineFull, nil
}

func (s *Service) resolveClickHouseClusterName(instance dbmodel.BaseInstance, operator sourcesvc.Operator, requestedCluster string) (string, bool, error) {
	availableClusters, err := listAvailableClickHouseClusters(instance, operator)
	if err != nil {
		return "", false, err
	}
	requestedCluster = strings.TrimSpace(requestedCluster)
	if requestedCluster != "" {
		if !containsClusterName(availableClusters, requestedCluster) {
			return "", false, fmt.Errorf("所选 ClickHouse cluster %q 不存在，可选值：%s", requestedCluster, strings.Join(availableClusters, ","))
		}
		return requestedCluster, true, nil
	}
	return "", false, nil
}

func listAvailableClickHouseClusters(instance dbmodel.BaseInstance, operator sourcesvc.Operator) ([]string, error) {
	return listClusterTopologyCandidates(operator)
}

func listClusterTopologyCandidates(operator sourcesvc.Operator) ([]string, error) {
	rows, err := operator.Query("SELECT cluster, max(shard_num) AS max_shard_num, max(replica_num) AS max_replica_num FROM system.clusters GROUP BY cluster")
	if err != nil {
		return nil, err
	}
	candidates := make(map[string]struct{})
	for _, row := range rows {
		cluster, _ := row["cluster"].(string)
		trimmed := strings.TrimSpace(cluster)
		if trimmed == "" || !isEligibleReportClusterName(trimmed) {
			continue
		}
		maxShardNum := castToInt(row["max_shard_num"])
		maxReplicaNum := castToInt(row["max_replica_num"])
		if maxShardNum > 1 || maxReplicaNum > 1 {
			candidates[trimmed] = struct{}{}
		}
	}
	return sortedClusterNames(candidates), nil
}

func sortedClusterNames(set map[string]struct{}) []string {
	names := make([]string, 0, len(set))
	for name := range set {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func containsClusterName(names []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, name := range names {
		if strings.TrimSpace(name) == target {
			return true
		}
	}
	return false
}

func preferredClusterName(names []string) string {
	filtered := make([]string, 0, len(names))
	for _, name := range names {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" || !isEligibleReportClusterName(trimmed) {
			continue
		}
		filtered = append(filtered, trimmed)
	}
	if len(filtered) == 0 {
		return ""
	}
	if len(filtered) == 1 {
		return filtered[0]
	}
	nonDefault := make([]string, 0, len(filtered))
	for _, name := range filtered {
		if strings.EqualFold(name, "default") {
			continue
		}
		nonDefault = append(nonDefault, name)
	}
	if len(nonDefault) == 1 {
		return nonDefault[0]
	}
	if len(nonDefault) == 0 {
		return ""
	}
	return ""
}

func isEligibleReportClusterName(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		return false
	}
	disallowedFragments := []string{
		"internal_replication",
		"localhost",
		"unavailable",
	}
	for _, fragment := range disallowedFragments {
		if strings.Contains(normalized, fragment) {
			return false
		}
	}
	return true
}

func parseDistributedLocalTable(engineFull string) (string, error) {
	matches := reportDistributedEnginePattern.FindStringSubmatch(strings.TrimSpace(engineFull))
	if len(matches) != 4 {
		return "", fmt.Errorf("unsupported engine_full: %s", engineFull)
	}
	return matches[3], nil
}

func (s *Service) buildClusterAwareDropSQL(database, table, clusterName string) string {
	if strings.TrimSpace(clusterName) == "" {
		return fmt.Sprintf("DROP TABLE IF EXISTS %s", quoteTable(database, table))
	}
	return fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER '%s'", quoteTable(database, table), escapeSQLString(clusterName))
}

func (s *Service) buildAccelerationTargetDropSQLs(acceleration dbmodel.ReportAcceleration) []string {
	sqls := make([]string, 0, 2)
	sqls = append(sqls, s.buildClusterAwareDropSQL(acceleration.SourceDatabase, acceleration.TargetTable, acceleration.ClusterName))
	localTable := strings.TrimSpace(acceleration.TargetLocalTable)
	if localTable != "" && localTable != acceleration.TargetTable {
		sqls = append(sqls, s.buildClusterAwareDropSQL(acceleration.SourceDatabase, localTable, acceleration.ClusterName))
	}
	return sqls
}

func castToInt(value interface{}) int {
	switch v := value.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case uint32:
		return int(v)
	case uint64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}
