package report

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const defaultWhereCheckWindowSeconds = 15 * 60

var (
	reportWhereBareStringPattern           = regexp.MustCompile(`(?i)(^|\s+and\s+|\()\s*([A-Za-z0-9_.` + "`" + `]+)\s*(=|!=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\)|$)`)
	reportWhereBareStringExpressionPattern = regexp.MustCompile(`^(\(*\s*)([A-Za-z0-9_.` + "`" + `]+)\s*(=|!=)\s*([A-Za-z_][A-Za-z0-9_]*)(\s*\)*)$`)
)

func CheckWhere(req view.ReqReportWhereCheck) (view.RespReportWhereCheck, error) {
	return defaultService.CheckWhere(req)
}

func (s *Service) CheckWhere(req view.ReqReportWhereCheck) (view.RespReportWhereCheck, error) {
	windowSeconds := req.WindowSeconds
	if windowSeconds <= 0 {
		windowSeconds = defaultWhereCheckWindowSeconds
	}
	if windowSeconds > 3600 {
		windowSeconds = 3600
	}
	now := s.now()
	windowStart := now.Add(-time.Duration(windowSeconds) * time.Second)
	windowEnd := now
	if !s.useDB() {
		return view.RespReportWhereCheck{
			Passed:        true,
			RowCount:      12,
			WindowStart:   formatReportTime(windowStart),
			WindowEnd:     formatReportTime(windowEnd),
			WindowSeconds: windowSeconds,
			Query:         buildReportWhereCheckQuery(req.Builder, dbmodel.TimeFieldTypeDT, req.Where, windowStart, windowEnd),
			Message:       "试跑通过，最近 15 分钟命中 12 行。",
		}, nil
	}
	return s.checkWhereFromDB(req, windowStart, windowEnd, windowSeconds)
}

func (s *Service) checkWhereFromDB(req view.ReqReportWhereCheck, windowStart, windowEnd time.Time, windowSeconds int) (view.RespReportWhereCheck, error) {
	builder := req.Builder
	if builder.InstanceID <= 0 || builder.Database == "" || builder.Table == "" || builder.TimeField == "" {
		return view.RespReportWhereCheck{}, fmt.Errorf("instanceId、database、table、timeField 不能为空")
	}
	if err := validateReportWhereCheckLiterals(req.Where); err != nil {
		return view.RespReportWhereCheck{}, err
	}
	if err := validateAggregationWhere(req.Where); err != nil {
		return view.RespReportWhereCheck{}, err
	}
	operator, err := s.sourceOperatorFromDB(builder.InstanceID)
	if err != nil {
		return view.RespReportWhereCheck{}, err
	}
	columns, err := operator.Columns(builder.Database, builder.Table)
	if err != nil {
		return view.RespReportWhereCheck{}, err
	}
	topology := reportAccelerationTopology{
		SourceColumns:  columns,
		SourceTimeType: inferAccelerationTimeFieldType(columns, builder.TimeField),
	}
	if err = validateAggregationSourceFields(view.ReqReportBuilder{
		Database:  builder.Database,
		Table:     builder.Table,
		TimeField: builder.TimeField,
		Blocks: []view.ReqReportBlock{
			{Key: "where_check", Where: req.Where, Metrics: countOnlyReportMetrics()},
		},
	}, topology); err != nil {
		return view.RespReportWhereCheck{}, err
	}
	query := buildReportWhereCheckQuery(builder, topology.SourceTimeType, req.Where, windowStart, windowEnd)
	rows, err := operator.Query(query)
	if err != nil {
		return view.RespReportWhereCheck{}, normalizeReportWhereCheckError(req.Where, err)
	}
	var rowCount int64
	if len(rows) > 0 {
		rowCount = int64(toFloat64Value(rows[0]["row_count"]))
	}
	return view.RespReportWhereCheck{
		Passed:        true,
		RowCount:      rowCount,
		WindowStart:   formatReportTime(windowStart),
		WindowEnd:     formatReportTime(windowEnd),
		WindowSeconds: windowSeconds,
		Query:         query,
		Message:       fmt.Sprintf("试跑通过，最近 %d 分钟命中 %d 行。", windowSeconds/60, rowCount),
	}, nil
}

func validateReportWhereCheckLiterals(where string) error {
	for _, match := range reportWhereBareStringPattern.FindAllStringSubmatch(strings.TrimSpace(where), -1) {
		if len(match) < 5 {
			continue
		}
		value := strings.TrimSpace(match[4])
		if strings.EqualFold(value, "null") || strings.EqualFold(value, "true") || strings.EqualFold(value, "false") {
			continue
		}
		field := normalizeFieldName(match[2])
		return fmt.Errorf("WHERE 条件中的字符串值需要加引号：请把 %s %s %s 改成 %s %s '%s'", field, match[3], value, field, match[3], value)
	}
	return nil
}

func normalizeReportWhereLiteralQuotes(where string) string {
	trimmed := strings.TrimSpace(where)
	if trimmed == "" {
		return ""
	}
	segments := splitWhereByAnd(trimmed)
	if len(segments) == 0 {
		return trimmed
	}
	normalized := make([]string, 0, len(segments))
	changed := false
	for _, segment := range segments {
		next := normalizeReportWhereSegmentLiteralQuotes(segment)
		if next != segment {
			changed = true
		}
		normalized = append(normalized, next)
	}
	if !changed {
		return trimmed
	}
	return strings.Join(normalized, " AND ")
}

func normalizeReportWhereSegmentLiteralQuotes(segment string) string {
	trimmed := strings.TrimSpace(segment)
	matches := reportWhereBareStringExpressionPattern.FindStringSubmatch(trimmed)
	if len(matches) < 6 {
		return segment
	}
	value := strings.TrimSpace(matches[4])
	if strings.EqualFold(value, "null") || strings.EqualFold(value, "true") || strings.EqualFold(value, "false") {
		return segment
	}
	return fmt.Sprintf("%s%s %s '%s'%s", matches[1], matches[2], matches[3], value, matches[5])
}

func normalizeReportWhereCheckError(where string, err error) error {
	message := err.Error()
	if strings.Contains(message, "Missing columns") {
		if hint := reportBareStringHint(where); hint != "" {
			return fmt.Errorf("%s", hint)
		}
		return fmt.Errorf("WHERE 条件引用了不存在的字段，请检查字段名或字符串值是否忘记加引号")
	}
	return err
}

func reportBareStringHint(where string) string {
	matches := reportWhereBareStringPattern.FindStringSubmatch(strings.TrimSpace(where))
	if len(matches) < 5 {
		return ""
	}
	value := strings.TrimSpace(matches[4])
	if strings.EqualFold(value, "null") || strings.EqualFold(value, "true") || strings.EqualFold(value, "false") {
		return ""
	}
	field := normalizeFieldName(matches[2])
	return fmt.Sprintf("WHERE 条件中的字符串值需要加引号：请把 %s %s %s 改成 %s %s '%s'", field, matches[3], value, field, matches[3], value)
}

func buildReportWhereCheckQuery(builder view.ReqReportBuilder, timeFieldType int, where string, start, end time.Time) string {
	timeField := quoteIdentifier(builder.TimeField)
	timeClause := accelerationTimeRangeClause(timeField, timeFieldType, start, end)
	whereClause, _ := buildWhereClause(where)
	return fmt.Sprintf(
		"SELECT count() AS row_count FROM %s WHERE 1 = 1%s%s",
		quoteTable(builder.Database, builder.Table),
		timeClause,
		whereClause,
	)
}
