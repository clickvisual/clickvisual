package report

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var (
	reportQueryWindowPattern         = regexp.MustCompile(`WITH toDateTime\('([^']+)'\) AS current_start, toDateTime\('([^']+)'\) AS current_end`)
	reportQueryTargetPattern         = regexp.MustCompile("FROM `([^`]+)`\\.`([^`]+)` WHERE ([^ ]+) >= current_start AND ([^ ]+) < current_end(?: AND \\((.*?)\\))?")
	reportQueryCombinedTargetPattern = regexp.MustCompile("FROM `([^`]+)`\\.`([^`]+)` WHERE \\(\\(([^ ]+) >= current_start AND ([^ ]+) < current_end\\) OR \\(([^ ]+) >= previous_start AND ([^ ]+) < previous_end\\)\\)(?: AND \\((.*?)\\))?")
	reportMetricPattern              = regexp.MustCompile(`SELECT \d+ AS block_order, \d+ AS metric_order, 0 AS item_order, 'aggregate' AS metric_kind, '(?:\\'|[^'])*' AS block_key, '(?:\\'|[^'])*' AS block_label, '((?:\\'|[^'])*)' AS metric_name, .*?toFloat64\((.+?)\) AS metric_value`)
)

func countOnlyReportMetrics() []view.ReqReportMetric {
	return []view.ReqReportMetric{{Key: "count", Label: "总量"}}
}

func defaultReportBlock(where string, metrics []view.ReqReportMetric) view.ReqReportBlock {
	if len(metrics) == 0 {
		metrics = countOnlyReportMetrics()
	}
	return view.ReqReportBlock{
		Key:     "default",
		Label:   "默认条件块",
		Where:   where,
		Metrics: metrics,
	}
}

func normalizeReportBlocks(req view.ReqReportBuilder) []view.ReqReportBlock {
	if len(req.Blocks) > 0 {
		blocks := make([]view.ReqReportBlock, 0, len(req.Blocks))
		for idx, block := range req.Blocks {
			if strings.TrimSpace(block.Key) == "" {
				block.Key = fmt.Sprintf("block_%d", idx+1)
			}
			if block.Metrics == nil {
				block.Metrics = []view.ReqReportMetric{}
			}
			blocks = append(blocks, block)
		}
		return blocks
	}
	return []view.ReqReportBlock{defaultReportBlock(req.Where, req.Metrics)}
}

func sanitizeReportBuilder(req view.ReqReportBuilder) view.ReqReportBuilder {
	if len(req.Blocks) > 0 {
		req.Blocks = normalizeReportBlocks(req)
		for idx := range req.Blocks {
			if len(req.Blocks[idx].Metrics) == 0 {
				req.Blocks[idx].Metrics = countOnlyReportMetrics()
			}
		}
		req.Metrics = nil
		req.Where = ""
		return req
	}
	if len(req.Metrics) == 0 {
		req.Metrics = countOnlyReportMetrics()
	}
	req.Blocks = []view.ReqReportBlock{defaultReportBlock(req.Where, req.Metrics)}
	return req
}

func normalizeReportDefinition(req view.ReqReportDefinition, now time.Time) (view.ReqReportDefinition, error) {
	if req.Builder == nil {
		return req, nil
	}
	builder := sanitizeReportBuilder(*req.Builder)
	req.Builder = &builder
	queryText, err := buildReportQuery(*req.Builder, now)
	if err != nil {
		return view.ReqReportDefinition{}, err
	}
	req.QueryMode = "sql"
	req.QueryText = queryText
	if strings.TrimSpace(req.TemplateKey) == "" {
		req.TemplateKey = "report-builder-default"
	}
	if strings.TrimSpace(req.OutputFormat) == "" {
		req.OutputFormat = "markdown"
	}
	if strings.TrimSpace(req.Desc) == "" {
		req.Desc = fmt.Sprintf("%s.%s 最近%s，昨天同期环比", req.Builder.Database, req.Builder.Table, req.Builder.TimeRange)
	}
	return req, nil
}

func marshalReportBuilder(builder *view.ReqReportBuilder) string {
	if builder == nil {
		return ""
	}
	data, err := json.Marshal(builder)
	if err != nil {
		return ""
	}
	return string(data)
}

func resolveReportBuilder(report dbmodel.Report) *view.ReqReportBuilder {
	if builder := parseStoredReportBuilder(report.BuilderConfig); builder != nil {
		return builder
	}
	return inferReportBuilder(report.QueryText)
}

func parseStoredReportBuilder(raw string) *view.ReqReportBuilder {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	var builder view.ReqReportBuilder
	if err := json.Unmarshal([]byte(raw), &builder); err != nil {
		return nil
	}
	if strings.TrimSpace(builder.Database) == "" || strings.TrimSpace(builder.Table) == "" {
		return nil
	}
	if len(builder.Blocks) > 0 {
		builder.Blocks = normalizeReportBlocks(builder)
		builder.Where = ""
		builder.Metrics = nil
		return &builder
	}
	if builder.Metrics == nil {
		builder.Metrics = []view.ReqReportMetric{}
	}
	builder.Blocks = []view.ReqReportBlock{defaultReportBlock(builder.Where, builder.Metrics)}
	return &builder
}

func inferReportBuilder(queryText string) *view.ReqReportBuilder {
	queryText = strings.TrimSpace(queryText)
	if queryText == "" {
		return nil
	}

	targetMatch := reportQueryTargetPattern.FindStringSubmatch(queryText)
	if len(targetMatch) < 5 || targetMatch[3] != targetMatch[4] {
		targetMatch = reportQueryCombinedTargetPattern.FindStringSubmatch(queryText)
		if len(targetMatch) < 7 || targetMatch[3] != targetMatch[4] || targetMatch[3] != targetMatch[5] || targetMatch[3] != targetMatch[6] {
			return nil
		}
	}

	builder := &view.ReqReportBuilder{
		Database:   targetMatch[1],
		Table:      targetMatch[2],
		TimeField:  targetMatch[3],
		Where:      targetMatch[len(targetMatch)-1],
		InstanceID: 0,
	}

	if windowMatch := reportQueryWindowPattern.FindStringSubmatch(queryText); len(windowMatch) == 3 {
		currentStart, startErr := time.ParseInLocation("2006-01-02 15:04:05", windowMatch[1], time.Local)
		currentEnd, endErr := time.ParseInLocation("2006-01-02 15:04:05", windowMatch[2], time.Local)
		if startErr == nil && endErr == nil {
			switch currentEnd.Sub(currentStart) {
			case time.Hour:
				builder.TimeRange = "1h"
			case 24 * time.Hour:
				builder.TimeRange = "1d"
			}
		}
	}
	if builder.TimeRange == "" {
		builder.TimeRange = "1h"
	}

	metricMatches := reportMetricPattern.FindAllStringSubmatch(queryText, -1)
	if len(metricMatches) == 0 {
		builder.Metrics = []view.ReqReportMetric{{Key: "count", Label: "总量"}}
		builder.Blocks = []view.ReqReportBlock{defaultReportBlock(builder.Where, builder.Metrics)}
		return builder
	}
	builder.Metrics = make([]view.ReqReportMetric, 0, len(metricMatches))
	for _, match := range metricMatches {
		if len(match) < 3 {
			continue
		}
		label := strings.ReplaceAll(match[1], `\'`, `'`)
		expression := strings.TrimSpace(match[2])
		metric := view.ReqReportMetric{
			Label: label,
		}
		if expression == "count(*)" {
			metric.Key = "count"
		} else {
			metric.Key = "custom"
			metric.Expression = expression
		}
		builder.Metrics = append(builder.Metrics, metric)
	}
	if len(builder.Metrics) == 0 {
		builder.Metrics = []view.ReqReportMetric{{Key: "count", Label: "总量"}}
	}
	builder.Blocks = []view.ReqReportBlock{defaultReportBlock(builder.Where, builder.Metrics)}
	return builder
}

func buildReportQuery(req view.ReqReportBuilder, now time.Time) (string, error) {
	blocks := normalizeReportBlocks(req)
	if len(blocks) > 5 {
		return "", fmt.Errorf("blocks 数量不能超过 5")
	}
	req.Blocks = blocks
	req = sanitizeReportBuilder(req)
	if strings.TrimSpace(req.Database) == "" || strings.TrimSpace(req.Table) == "" || strings.TrimSpace(req.TimeField) == "" {
		return "", fmt.Errorf("database、table、timeField 不能为空")
	}
	if len(req.Blocks) == 0 {
		return "", fmt.Errorf("metrics 不能为空")
	}
	duration, err := reportDuration(req.TimeRange)
	if err != nil {
		return "", err
	}

	currentEnd := now
	currentStart := now.Add(-duration)
	previousEnd := now.Add(-24 * time.Hour)
	previousStart := previousEnd.Add(-duration)

	parts := make([]string, 0)
	for blockIndex, block := range req.Blocks {
		if len(block.Metrics) == 0 {
			return "", fmt.Errorf("metrics 不能为空")
		}
		whereClause, err := buildWhereClause(block.Where)
		if err != nil {
			return "", err
		}
		blockKey := strings.TrimSpace(block.Key)
		if blockKey == "" {
			blockKey = "default"
		}
		blockLabel := strings.TrimSpace(block.Label)
		if blockLabel == "" {
			blockLabel = blockKey
		}
		for metricIndex, metric := range block.Metrics {
			label := strings.TrimSpace(metric.Label)
			if label == "" {
				label = metric.Key
			}
			switch strings.TrimSpace(metric.Key) {
			case "topn":
				groupBy, limit, topNErr := topNMetricConfig(metric)
				if topNErr != nil {
					return "", topNErr
				}
				parts = append(parts, fmt.Sprintf(
					`SELECT %d AS block_order, %d AS metric_order, 0 AS item_order, 'topn' AS metric_kind, '%s' AS block_key, '%s' AS block_label, '%s' AS metric_name, CAST(NULL AS Nullable(Float64)) AS current_value, CAST(NULL AS Nullable(Float64)) AS previous_value, top_key, top_value FROM (SELECT toString(%s) AS top_key, toFloat64(count(*)) AS top_value FROM %s WHERE %s >= current_start AND %s < current_end%s GROUP BY %s ORDER BY top_value DESC, top_key ASC LIMIT %d)`,
					blockIndex,
					metricIndex,
					escapeSQLString(blockKey),
					escapeSQLString(blockLabel),
					escapeSQLString(label),
					groupBy,
					quoteTable(req.Database, req.Table),
					req.TimeField,
					req.TimeField,
					whereClause,
					groupBy,
					limit,
				))
			default:
				expression, exprErr := metricExpression(metric)
				if exprErr != nil {
					return "", exprErr
				}
				parts = append(parts, fmt.Sprintf(
					`SELECT %d AS block_order, %d AS metric_order, 0 AS item_order, 'aggregate' AS metric_kind, '%s' AS block_key, '%s' AS block_label, '%s' AS metric_name, current_value, previous_value, CAST(NULL AS Nullable(String)) AS top_key, CAST(NULL AS Nullable(Float64)) AS top_value FROM (SELECT anyIf(metric_value, window_name = 'current') AS current_value, anyIf(metric_value, window_name = 'previous') AS previous_value FROM (SELECT windows.window_name, CAST(aggregated.metric_value AS Nullable(Float64)) AS metric_value FROM (SELECT 'current' AS window_name UNION ALL SELECT 'previous' AS window_name) AS windows LEFT JOIN (SELECT if(%s >= current_start AND %s < current_end, 'current', 'previous') AS window_name, toFloat64(%s) AS metric_value FROM %s WHERE ((%s >= current_start AND %s < current_end) OR (%s >= previous_start AND %s < previous_end))%s GROUP BY window_name) AS aggregated ON windows.window_name = aggregated.window_name))`,
					blockIndex,
					metricIndex,
					escapeSQLString(blockKey),
					escapeSQLString(blockLabel),
					escapeSQLString(label),
					req.TimeField,
					req.TimeField,
					expression,
					quoteTable(req.Database, req.Table),
					req.TimeField,
					req.TimeField,
					req.TimeField,
					req.TimeField,
					whereClause,
				))
			}
		}
	}

	return fmt.Sprintf(
		"WITH toDateTime('%s') AS current_start, toDateTime('%s') AS current_end, toDateTime('%s') AS previous_start, toDateTime('%s') AS previous_end SELECT block_key, block_label, metric_name, metric_kind, current_value, previous_value, if(metric_kind = 'aggregate' AND previous_value != 0, (current_value - previous_value) / previous_value, NULL) AS ratio_vs_yesterday, top_key, top_value FROM (%s) ORDER BY block_order, metric_order, if(metric_kind = 'topn', 0, item_order), if(metric_kind = 'topn', top_value, CAST(NULL AS Nullable(Float64))) DESC, if(metric_kind = 'topn', top_key, CAST(NULL AS Nullable(String))) ASC",
		currentStart.Format("2006-01-02 15:04:05"),
		currentEnd.Format("2006-01-02 15:04:05"),
		previousStart.Format("2006-01-02 15:04:05"),
		previousEnd.Format("2006-01-02 15:04:05"),
		strings.Join(parts, " UNION ALL "),
	), nil
}

func buildWhereClause(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}
	if strings.Contains(trimmed, ";") {
		return "", fmt.Errorf("where 不能为空或包含非法多语句")
	}
	return fmt.Sprintf(" AND (%s)", trimmed), nil
}

func metricExpression(metric view.ReqReportMetric) (string, error) {
	switch strings.TrimSpace(metric.Key) {
	case "count", "":
		return "count(*)", nil
	case "custom":
		expr := strings.TrimSpace(metric.Expression)
		if expr == "" {
			return "", fmt.Errorf("custom metric expression 不能为空")
		}
		return expr, nil
	case "topn":
		return "", fmt.Errorf("topn 指标不支持表达式模式")
	default:
		if expr := strings.TrimSpace(metric.Expression); expr != "" {
			return expr, nil
		}
		return "", fmt.Errorf("unsupported metric key: %s", metric.Key)
	}
}

func topNMetricConfig(metric view.ReqReportMetric) (string, int, error) {
	groupBy := strings.TrimSpace(metric.GroupBy)
	if groupBy == "" {
		return "", 0, fmt.Errorf("topn metric groupBy 不能为空")
	}
	if strings.ContainsAny(groupBy, " ;\n\t") {
		return "", 0, fmt.Errorf("topn metric groupBy 非法")
	}
	limit := metric.Limit
	if limit <= 0 {
		limit = 3
	}
	if limit > 10 {
		return "", 0, fmt.Errorf("topn metric limit 不能超过 10")
	}
	return groupBy, limit, nil
}

func reportDuration(value string) (time.Duration, error) {
	switch strings.TrimSpace(value) {
	case "1h":
		return time.Hour, nil
	case "1d":
		return 24 * time.Hour, nil
	default:
		return 0, fmt.Errorf("unsupported timeRange: %s", value)
	}
}

func quoteTable(database, table string) string {
	return fmt.Sprintf("`%s`.`%s`", database, table)
}

func escapeSQLString(value string) string {
	return strings.ReplaceAll(value, "'", "\\'")
}
