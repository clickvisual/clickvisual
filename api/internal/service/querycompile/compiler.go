package querycompile

import (
	"fmt"
	"strings"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type CompileContext struct {
	TableName                string
	TimeField                string
	TimeFieldType            int
	RawJSONColumn            string
	RawJSONColumnUnavailable bool
	NestedJSONPaths          map[string]string
}

func Compile(req view.QueryRequestV2, ctx CompileContext) (sql string, plan view.QueryPlan, err error) {
	whereParts, plan, err := buildWherePlan(req, ctx)
	if err != nil {
		return "", view.QueryPlan{}, err
	}

	orderBy := []string{fmt.Sprintf("%s DESC", normalizedTimeField(ctx))}
	sql = fmt.Sprintf(
		"SELECT * FROM %s WHERE %s ORDER BY %s LIMIT %d OFFSET %d",
		ctx.TableName,
		strings.Join(whereParts, " AND "),
		strings.Join(orderBy, ", "),
		pageSizeOrDefault(req.PageSize),
		calcOffset(req.Page, req.PageSize),
	)
	plan.OrderBy = orderBy
	return sql, plan, nil
}

func CompileCount(req view.QueryRequestV2, ctx CompileContext) (sql string, plan view.QueryPlan, err error) {
	whereParts, plan, err := buildWherePlan(req, ctx)
	if err != nil {
		return "", view.QueryPlan{}, err
	}
	sql = fmt.Sprintf(
		"SELECT count() AS count FROM %s WHERE %s",
		ctx.TableName,
		strings.Join(whereParts, " AND "),
	)
	return sql, plan, nil
}

func CompileFieldStats(req view.QueryFieldStatsRequest, ctx CompileContext) (statsSQL string, totalSQL string, plan view.QueryPlan, err error) {
	whereParts, plan, err := buildWherePlan(req.QueryRequestV2, ctx)
	if err != nil {
		return "", "", view.QueryPlan{}, err
	}
	fieldExpr, execution, highCost, err := buildFieldExpression(req.Field, ctx)
	if err != nil {
		return "", "", view.QueryPlan{}, err
	}
	valueExpr := fmt.Sprintf("ifNull(toString(%s), '')", fieldExpr)
	whereParts = append(whereParts, fmt.Sprintf("%s != ''", valueExpr))
	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	plan.PlannedConditions = append(plan.PlannedConditions, view.PlannedCondition{
		FieldKey:    req.Field.FieldKey,
		Execution:   execution,
		Expression:  fieldExpr,
		HighCost:    highCost,
		WarningCode: warningCode(execution, highCost),
	})
	statsSQL = fmt.Sprintf(
		"SELECT %s AS field_value, count() AS count FROM %s WHERE %s GROUP BY field_value ORDER BY count DESC, field_value ASC LIMIT %d",
		valueExpr,
		ctx.TableName,
		strings.Join(whereParts, " AND "),
		limit,
	)
	totalSQL = fmt.Sprintf(
		"SELECT count() AS count FROM %s WHERE %s",
		ctx.TableName,
		strings.Join(whereParts, " AND "),
	)
	return statsSQL, totalSQL, plan, nil
}

func buildWherePlan(req view.QueryRequestV2, ctx CompileContext) (whereParts []string, plan view.QueryPlan, err error) {
	if ctx.TableName == "" {
		return nil, view.QueryPlan{}, fmt.Errorf("table name is required")
	}
	if ctx.TimeField == "" {
		ctx.TimeField = "_time_second_"
	}
	if ctx.RawJSONColumn == "" && !ctx.RawJSONColumnUnavailable {
		ctx.RawJSONColumn = "_raw_log_"
	}

	whereParts = []string{
		fmt.Sprintf("%s >= toDateTime(%d)", ctx.TimeField, req.ST),
		fmt.Sprintf("%s < toDateTime(%d)", ctx.TimeField, req.ET),
	}
	planned := make([]view.PlannedCondition, 0, len(req.Conditions))
	warnings := make([]view.QueryWarning, 0)
	for _, cond := range req.Conditions {
		expr, plannedCond, compileErr := compileCondition(cond, ctx)
		if compileErr != nil {
			return nil, view.QueryPlan{}, compileErr
		}
		whereParts = append(whereParts, expr)
		planned = append(planned, plannedCond)
		if plannedCond.HighCost {
			warnings = append(warnings, view.QueryWarning{
				Code:    plannedCond.WarningCode,
				Level:   "warning",
				Message: fmt.Sprintf("field %s uses high-cost %s execution", plannedCond.FieldKey, plannedCond.Execution),
			})
		}
	}

	plan = view.QueryPlan{
		Table:             ctx.TableName,
		PlannedConditions: planned,
		Warnings:          warnings,
	}
	return whereParts, plan, nil
}

func normalizedTimeField(ctx CompileContext) string {
	if ctx.TimeField == "" {
		return "_time_second_"
	}
	return ctx.TimeField
}

func compileCondition(cond view.QueryConditionV2, ctx CompileContext) (expr string, planned view.PlannedCondition, err error) {
	fieldExpr, execution, highCost, err := buildFieldExpression(cond.Field, ctx)
	if err != nil {
		return "", view.PlannedCondition{}, err
	}
	fieldExpr, cond = normalizeLogLevelCondition(fieldExpr, cond)
	expr, err = compileOperator(fieldExpr, cond.Operator, cond.Value, cond.ValueTo, cond.Field.ValueType)
	if err != nil {
		return "", view.PlannedCondition{}, err
	}
	if fallbackExpr := compileRawLogEscapedQuoteFallback(fieldExpr, cond, ctx); fallbackExpr != "" {
		expr = fallbackExpr
	}
	planned = view.PlannedCondition{
		FieldKey:    cond.Field.FieldKey,
		Execution:   execution,
		Expression:  fieldExpr,
		HighCost:    highCost,
		WarningCode: warningCode(execution, highCost),
	}
	return expr, planned, nil
}

func compileRawLogEscapedQuoteFallback(expr string, cond view.QueryConditionV2, ctx CompileContext) string {
	if cond.Operator != view.QueryOperatorContains && cond.Operator != view.QueryOperatorNotContains {
		return ""
	}
	if cond.Field.ValueType != view.QueryValueTypeString && cond.Field.ValueType != view.QueryValueTypeUnknown {
		return ""
	}
	value, ok := cond.Value.(string)
	if !ok || !strings.Contains(value, "\"") {
		return ""
	}
	rawColumn := ctx.RawJSONColumn
	if rawColumn == "" {
		rawColumn = "_raw_log_"
	}
	if strings.Trim(expr, "`") != rawColumn {
		return ""
	}
	normalPattern := escapeLikeString(value)
	jsonEscapedPattern := escapeLikeString(strings.ReplaceAll(value, "\"", "\\\\\""))
	if normalPattern == jsonEscapedPattern {
		return ""
	}
	if cond.Operator == view.QueryOperatorNotContains {
		return fmt.Sprintf("(%s NOT LIKE '%%%s%%' AND %s NOT LIKE '%%%s%%')", expr, normalPattern, expr, jsonEscapedPattern)
	}
	return fmt.Sprintf("(%s LIKE '%%%s%%' OR %s LIKE '%%%s%%')", expr, normalPattern, expr, jsonEscapedPattern)
}

func normalizeLogLevelCondition(expr string, cond view.QueryConditionV2) (string, view.QueryConditionV2) {
	if !isLogLevelField(cond.Field.FieldKey) && !isLogLevelField(cond.Field.Path) {
		return expr, cond
	}
	if cond.Field.ValueType != view.QueryValueTypeString && cond.Field.ValueType != view.QueryValueTypeUnknown {
		return expr, cond
	}
	switch cond.Operator {
	case view.QueryOperatorEQ, view.QueryOperatorNEQ, view.QueryOperatorContains, view.QueryOperatorNotContains, view.QueryOperatorIn:
	default:
		return expr, cond
	}
	cond.Value = normalizeLogLevelValue(cond.Value)
	cond.ValueTo = normalizeLogLevelValue(cond.ValueTo)
	return fmt.Sprintf("lowerUTF8(replaceRegexpAll(%s, '\\x1b\\\\[[0-9;]*m', ''))", expr), cond
}

func isLogLevelField(field string) bool {
	switch strings.ToLower(strings.TrimSpace(field)) {
	case "lv", "level", "severity", "log_level":
		return true
	default:
		return false
	}
}

func normalizeLogLevelValue(value interface{}) interface{} {
	switch typed := value.(type) {
	case []interface{}:
		items := make([]interface{}, 0, len(typed))
		for _, item := range typed {
			items = append(items, normalizeLogLevelValue(item))
		}
		return items
	case []string:
		items := make([]string, 0, len(typed))
		for _, item := range typed {
			items = append(items, strings.ToLower(strings.TrimSpace(item)))
		}
		return items
	case string:
		return strings.ToLower(strings.TrimSpace(typed))
	default:
		return value
	}
}

func buildFieldExpression(field view.QueryFieldRef, ctx CompileContext) (expr string, execution string, highCost bool, err error) {
	if isRawLogFieldRef(field) {
		rawColumn, rawErr := rawLogColumnExpr(ctx)
		if rawErr != nil {
			return "", "", false, rawErr
		}
		return rawColumn, "column", false, nil
	}
	if isContextTimeFieldRef(field, ctx) {
		return normalizedTimeField(ctx), "column", false, nil
	}
	if field.IsAccelerated && field.AcceleratedCol != "" {
		return fmt.Sprintf("`%s`", field.AcceleratedCol), "column", false, nil
	}
	switch field.Source {
	case view.QueryFieldSourceColumn:
		col := field.Path
		if field.AcceleratedCol != "" {
			col = field.AcceleratedCol
		}
		return fmt.Sprintf("`%s`", col), "column", false, nil
	case view.QueryFieldSourceTagPath:
		return buildTagPathExpr(field.Path, field.ValueType)
	case view.QueryFieldSourceJSONPath, view.QueryFieldSourceDerived:
		rawColumn, rawErr := rawLogColumnExpr(ctx)
		if rawErr != nil {
			return "", "", false, rawErr
		}
		jsonPath := normalizeRawJSONPath(field.Path, rawColumn)
		if nestedPath, ok := ctx.NestedJSONPaths[jsonPath]; ok && nestedPath != "" {
			innerPath := strings.TrimPrefix(jsonPath, nestedPath+".")
			return buildNestedJSONExpr(rawColumn, nestedPath, innerPath, field.ValueType)
		}
		return buildJSONValueExpr(rawColumn, jsonPath, field.ValueType)
	default:
		return "", "", false, fmt.Errorf("unsupported field source: %s", field.Source)
	}
}

func normalizeRawJSONPath(path string, rawColumn string) string {
	path = strings.TrimSpace(path)
	rawColumn = strings.Trim(strings.TrimSpace(rawColumn), "`")
	for _, prefix := range []string{rawColumn, "_raw_log_", "_raw_log", "raw_log"} {
		prefix = strings.TrimSpace(prefix)
		if prefix == "" {
			continue
		}
		if strings.HasPrefix(path, prefix+".") {
			return strings.TrimPrefix(path, prefix+".")
		}
	}
	return path
}

func buildTagPathExpr(path string, valueType view.QueryValueType) (string, string, bool, error) {
	parts := strings.Split(strings.TrimSpace(path), ".")
	if len(parts) < 2 || strings.TrimSpace(parts[0]) == "" || strings.TrimSpace(parts[len(parts)-1]) == "" {
		return "", "", false, fmt.Errorf("tag path %s is incomplete", path)
	}
	column := strings.TrimSpace(parts[0])
	tagKey := strings.TrimSpace(parts[len(parts)-1])
	pattern := fmt.Sprintf("%s=([^\",\\]]+)", escapeRegexpLiteral(tagKey))
	expr := fmt.Sprintf("extract(toString(`%s`), '%s')", strings.ReplaceAll(column, "`", "``"), escapeString(pattern))
	return expr, "tag_path", true, nil
}

func escapeRegexpLiteral(value string) string {
	replacer := strings.NewReplacer(
		`\`, `\\`,
		`.`, `\.`,
		`+`, `\+`,
		`*`, `\*`,
		`?`, `\?`,
		`^`, `\^`,
		`$`, `\$`,
		`(`, `\(`,
		`)`, `\)`,
		`[`, `\[`,
		`]`, `\]`,
		`{`, `\{`,
		`}`, `\}`,
		`|`, `\|`,
	)
	return replacer.Replace(value)
}

func isRawLogFieldRef(field view.QueryFieldRef) bool {
	for _, item := range []string{field.FieldKey, field.Path, field.AcceleratedCol} {
		switch strings.ToLower(strings.TrimSpace(item)) {
		case "_raw_log_", "_raw_log", "raw_log":
			return true
		}
	}
	return false
}

func isContextTimeFieldRef(field view.QueryFieldRef, ctx CompileContext) bool {
	timeField := strings.TrimSpace(ctx.TimeField)
	if timeField == "" {
		timeField = "_time_second_"
	}
	for _, item := range []string{field.FieldKey, field.Path, field.AcceleratedCol} {
		if strings.TrimSpace(item) == timeField {
			return true
		}
	}
	return false
}

func rawLogColumnExpr(ctx CompileContext) (string, error) {
	if ctx.RawJSONColumnUnavailable {
		return "", fmt.Errorf("当前日志表未配置日志内容字段，不能使用全局匹配或日志内容字段查询")
	}
	rawColumn := strings.TrimSpace(ctx.RawJSONColumn)
	if rawColumn == "" {
		rawColumn = "_raw_log_"
	}
	return rawColumn, nil
}

func pageSizeOrDefault(size uint32) uint32 {
	if size == 0 {
		return 20
	}
	return size
}

func calcOffset(page, pageSize uint32) uint32 {
	if page <= 1 {
		return 0
	}
	return (page - 1) * pageSizeOrDefault(pageSize)
}

func warningCode(execution string, highCost bool) string {
	if !highCost {
		return ""
	}
	return fmt.Sprintf("%s_high_cost", execution)
}
