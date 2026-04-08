package report

import (
	"fmt"
	"regexp"
	"strings"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var (
	reportAggregationFieldPattern      = regexp.MustCompile("^[A-Za-z0-9_.`]+$")
	reportAggregationEqPattern         = regexp.MustCompile("^([A-Za-z0-9_.`]+)\\s*(=|!=)\\s*('([^']|\\\\')*'|\"([^\"]|\\\\\")*\"|-?[0-9]+(?:\\.[0-9]+)?)$")
	reportAggregationInPattern         = regexp.MustCompile(`^([A-Za-z0-9_.` + "`" + `]+)\s+(in|not in)\s*\((.+)\)$`)
	reportAggregationLikePattern       = regexp.MustCompile(`^([A-Za-z0-9_.` + "`" + `]+)\s+(like|not like)\s+('([^']|\\\\')*'|"([^"]|\\\\")*")$`)
	reportAggregationAllowedMetricExpr = regexp.MustCompile(`^(count\(\*\)|sum\([A-Za-z0-9_.` + "`" + `]+\)|uniq\([A-Za-z0-9_.` + "`" + `]+\)|avg\([A-Za-z0-9_.` + "`" + `]+\))$`)
)

var reportAggregationAllowedFields = map[string]struct{}{
	"lv":                 {},
	"application":        {},
	"env":                {},
	"fileGuid":           {},
	"msg":                {},
	"status":             {},
	"container.name":     {},
	"host.name":          {},
	"k8s.namespace.name": {},
	"k8s.pod.name":       {},
}

var reportAggregationHighCostLikeFields = map[string]struct{}{
	"_raw_log_": {},
}

var reportAggregationAllowedGroupByFields = map[string]struct{}{
	"lv":                 {},
	"application":        {},
	"env":                {},
	"fileGuid":           {},
	"container.name":     {},
	"host.name":          {},
	"k8s.namespace.name": {},
}

func validateAggregationEligibility(builder view.ReqReportBuilder) error {
	builder = sanitizeReportBuilder(builder)
	if _, err := reportDuration(builder.TimeRange); err != nil {
		return fmt.Errorf("当前只支持固定时间范围预聚合: %w", err)
	}
	blocks := normalizeReportBlocks(builder)
	if len(blocks) == 0 {
		return fmt.Errorf("至少需要一个条件块")
	}
	if len(blocks) > 5 {
		return fmt.Errorf("预聚合模式下 block 数量不能超过 5")
	}
	topNGroupBys := make(map[string]struct{})
	for _, block := range blocks {
		if err := validateAggregationWhere(block.Where); err != nil {
			return err
		}
		if len(block.Metrics) == 0 {
			return fmt.Errorf("条件块 %s 未配置指标", blockLabelForError(block))
		}
		for _, metric := range block.Metrics {
			groupBy, err := validateAggregationMetric(metric)
			if err != nil {
				return fmt.Errorf("条件块 %s 指标 %s 不支持预聚合: %w", blockLabelForError(block), metricLabelForError(metric), err)
			}
			if groupBy != "" {
				topNGroupBys[groupBy] = struct{}{}
			}
		}
	}
	if len(topNGroupBys) > 1 {
		return fmt.Errorf("预聚合模式下同一张报表只允许一种 TopN 分组字段")
	}
	return nil
}

func validateAggregationWhere(raw string) error {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "1=1" || trimmed == "1 = 1" {
		return nil
	}
	lower := strings.ToLower(trimmed)
	if strings.Contains(lower, " regexp ") || strings.Contains(lower, " match(") {
		return fmt.Errorf("仅支持固定条件，不支持 regexp/match")
	}
	segments := splitWhereByAnd(trimmed)
	if len(segments) == 0 {
		return fmt.Errorf("条件不能为空")
	}
	for _, segment := range segments {
		expr := stripWrappingParentheses(strings.TrimSpace(segment))
		if expr == "" || expr == "1=1" || expr == "1 = 1" {
			continue
		}
		if matches := reportAggregationEqPattern.FindStringSubmatch(expr); len(matches) > 0 {
			if !isAllowedAggregationField(matches[1], false) {
				return fmt.Errorf("字段 %s 不在预聚合白名单内", normalizeFieldName(matches[1]))
			}
			continue
		}
		if matches := reportAggregationLikePattern.FindStringSubmatch(expr); len(matches) > 0 {
			field := normalizeFieldName(matches[1])
			if !isAllowedAggregationLikeField(field) {
				return fmt.Errorf("字段 %s 不在预聚合白名单内", field)
			}
			continue
		}
		if matches := reportAggregationInPattern.FindStringSubmatch(strings.ToLower(expr)); len(matches) > 0 {
			field := normalizeFieldName(matches[1])
			if !isAllowedAggregationField(field, false) {
				return fmt.Errorf("字段 %s 不在预聚合白名单内", field)
			}
			continue
		}
		return fmt.Errorf("不支持的条件表达式: %s", expr)
	}
	return nil
}

func splitWhereByAnd(raw string) []string {
	normalized := strings.ReplaceAll(raw, " AND ", " and ")
	normalized = strings.ReplaceAll(normalized, " And ", " and ")
	parts := strings.Split(normalized, " and ")
	resp := make([]string, 0, len(parts))
	for _, part := range parts {
		if strings.TrimSpace(part) != "" {
			resp = append(resp, part)
		}
	}
	return resp
}

func validateAggregationMetric(metric view.ReqReportMetric) (string, error) {
	key := strings.TrimSpace(strings.ToLower(metric.Key))
	switch key {
	case "", "count":
		return "", nil
	case "topn":
		groupBy, _, err := topNMetricConfig(metric)
		if err != nil {
			return "", err
		}
		if !isAllowedAggregationField(groupBy, true) {
			return "", fmt.Errorf("TopN 分组字段 %s 不在白名单内", normalizeFieldName(groupBy))
		}
		return normalizeFieldName(groupBy), nil
	case "custom":
		expr := strings.TrimSpace(strings.ToLower(metric.Expression))
		if expr == "" {
			return "", fmt.Errorf("自定义指标表达式不能为空")
		}
		if !reportAggregationAllowedMetricExpr.MatchString(expr) {
			return "", fmt.Errorf("仅支持 count(*)、sum(field)、uniq(field)、avg(field)")
		}
		field := aggregationMetricField(expr)
		if field != "" && !isAllowedAggregationField(field, false) {
			return "", fmt.Errorf("指标字段 %s 不在白名单内", field)
		}
		return "", nil
	default:
		return "", fmt.Errorf("不支持的指标类型 %s", metric.Key)
	}
}

func aggregationMetricField(expr string) string {
	start := strings.Index(expr, "(")
	end := strings.LastIndex(expr, ")")
	if start == -1 || end == -1 || start >= end-1 {
		return ""
	}
	field := normalizeFieldName(expr[start+1 : end])
	if field == "*" {
		return ""
	}
	return field
}

func isAllowedAggregationField(field string, groupBy bool) bool {
	field = normalizeFieldName(field)
	if !reportAggregationFieldPattern.MatchString(field) {
		return false
	}
	if groupBy {
		_, ok := reportAggregationAllowedGroupByFields[field]
		return ok
	}
	_, ok := reportAggregationAllowedFields[field]
	return ok
}

func isAllowedAggregationLikeField(field string) bool {
	field = normalizeFieldName(field)
	if !reportAggregationFieldPattern.MatchString(field) {
		return false
	}
	if _, ok := reportAggregationAllowedFields[field]; ok {
		return true
	}
	_, ok := reportAggregationHighCostLikeFields[field]
	return ok
}

func isHighCostAggregationWhere(raw string) bool {
	segments := splitWhereByAnd(strings.TrimSpace(raw))
	for _, segment := range segments {
		expr := stripWrappingParentheses(strings.TrimSpace(segment))
		if matches := reportAggregationLikePattern.FindStringSubmatch(expr); len(matches) > 0 {
			field := normalizeFieldName(matches[1])
			if _, ok := reportAggregationHighCostLikeFields[field]; ok {
				return true
			}
		}
	}
	return false
}

func normalizeFieldName(field string) string {
	return strings.Trim(strings.TrimSpace(field), "`")
}

func stripWrappingParentheses(input string) string {
	for {
		trimmed := strings.TrimSpace(input)
		if len(trimmed) < 2 || trimmed[0] != '(' || trimmed[len(trimmed)-1] != ')' {
			return trimmed
		}
		input = strings.TrimSpace(trimmed[1 : len(trimmed)-1])
	}
}

func blockLabelForError(block view.ReqReportBlock) string {
	if strings.TrimSpace(block.Label) != "" {
		return block.Label
	}
	if strings.TrimSpace(block.Key) != "" {
		return block.Key
	}
	return "默认条件块"
}

func metricLabelForError(metric view.ReqReportMetric) string {
	if strings.TrimSpace(metric.Label) != "" {
		return metric.Label
	}
	if strings.TrimSpace(metric.Key) != "" {
		return metric.Key
	}
	return "未命名指标"
}
