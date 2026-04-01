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
	reportQueryWindowPattern = regexp.MustCompile(`WITH toDateTime\('([^']+)'\) AS current_start, toDateTime\('([^']+)'\) AS current_end`)
	reportQueryTargetPattern = regexp.MustCompile("FROM `([^`]+)`\\.`([^`]+)` WHERE ([^ ]+) >= current_start AND ([^ ]+) < current_end(?: AND \\((.*?)\\))?")
	reportMetricPattern      = regexp.MustCompile(`SELECT '((?:\\'|[^'])*)' AS metric_name, (.+?) AS current_value, \(SELECT .+? AS previous_value FROM`)
)

func countOnlyReportMetrics() []view.ReqReportMetric {
	return []view.ReqReportMetric{{Key: "count", Label: "总量"}}
}

func sanitizeReportBuilder(req view.ReqReportBuilder) view.ReqReportBuilder {
	req.Metrics = countOnlyReportMetrics()
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
	if builder.Metrics == nil {
		builder.Metrics = []view.ReqReportMetric{}
	}
	return &builder
}

func inferReportBuilder(queryText string) *view.ReqReportBuilder {
	queryText = strings.TrimSpace(queryText)
	if queryText == "" {
		return nil
	}

	targetMatch := reportQueryTargetPattern.FindStringSubmatch(queryText)
	if len(targetMatch) < 5 || targetMatch[3] != targetMatch[4] {
		return nil
	}

	builder := &view.ReqReportBuilder{
		Database:   targetMatch[1],
		Table:      targetMatch[2],
		TimeField:  targetMatch[3],
		Where:      targetMatch[5],
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
	return builder
}

func buildReportQuery(req view.ReqReportBuilder, now time.Time) (string, error) {
	req = sanitizeReportBuilder(req)
	if strings.TrimSpace(req.Database) == "" || strings.TrimSpace(req.Table) == "" || strings.TrimSpace(req.TimeField) == "" {
		return "", fmt.Errorf("database、table、timeField 不能为空")
	}
	if len(req.Metrics) == 0 {
		return "", fmt.Errorf("metrics 不能为空")
	}
	whereClause, err := buildWhereClause(req.Where)
	if err != nil {
		return "", err
	}
	duration, err := reportDuration(req.TimeRange)
	if err != nil {
		return "", err
	}

	currentEnd := now
	currentStart := now.Add(-duration)
	previousEnd := now.Add(-24 * time.Hour)
	previousStart := previousEnd.Add(-duration)

	parts := make([]string, 0, len(req.Metrics))
	for _, metric := range req.Metrics {
		label := strings.TrimSpace(metric.Label)
		if label == "" {
			label = metric.Key
		}
		expression, err := metricExpression(metric)
		if err != nil {
			return "", err
		}
		parts = append(parts, fmt.Sprintf(
			`SELECT '%s' AS metric_name, %s AS current_value, (SELECT %s FROM %s WHERE %s >= previous_start AND %s < previous_end%s) AS previous_value FROM %s WHERE %s >= current_start AND %s < current_end%s`,
			escapeSQLString(label),
			expression,
			expression,
			quoteTable(req.Database, req.Table),
			req.TimeField,
			req.TimeField,
			whereClause,
			quoteTable(req.Database, req.Table),
			req.TimeField,
			req.TimeField,
			whereClause,
		))
	}

	return fmt.Sprintf(
		"WITH toDateTime('%s') AS current_start, toDateTime('%s') AS current_end, toDateTime('%s') AS previous_start, toDateTime('%s') AS previous_end SELECT metric_name, current_value, previous_value, if(previous_value = 0, NULL, (current_value - previous_value) / previous_value) AS ratio_vs_yesterday FROM (%s)",
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
	default:
		if expr := strings.TrimSpace(metric.Expression); expr != "" {
			return expr, nil
		}
		return "", fmt.Errorf("unsupported metric key: %s", metric.Key)
	}
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
