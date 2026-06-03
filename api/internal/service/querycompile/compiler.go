package querycompile

import (
	"fmt"
	"strings"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type CompileContext struct {
	TableName       string
	TimeField       string
	TimeFieldType   int
	RawJSONColumn   string
	NestedJSONPaths map[string]string
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

func buildWherePlan(req view.QueryRequestV2, ctx CompileContext) (whereParts []string, plan view.QueryPlan, err error) {
	if ctx.TableName == "" {
		return nil, view.QueryPlan{}, fmt.Errorf("table name is required")
	}
	if ctx.TimeField == "" {
		ctx.TimeField = "_time_second_"
	}
	if ctx.RawJSONColumn == "" {
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
	expr, err = compileOperator(fieldExpr, cond.Operator, cond.Value, cond.ValueTo, cond.Field.ValueType)
	if err != nil {
		return "", view.PlannedCondition{}, err
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

func buildFieldExpression(field view.QueryFieldRef, ctx CompileContext) (expr string, execution string, highCost bool, err error) {
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
	case view.QueryFieldSourceJSONPath, view.QueryFieldSourceTagPath, view.QueryFieldSourceDerived:
		if nestedPath, ok := ctx.NestedJSONPaths[field.Path]; ok && nestedPath != "" {
			innerPath := strings.TrimPrefix(field.Path, nestedPath+".")
			return buildNestedJSONExpr(ctx.RawJSONColumn, nestedPath, innerPath, field.ValueType)
		}
		return buildJSONValueExpr(ctx.RawJSONColumn, field.Path, field.ValueType)
	default:
		return "", "", false, fmt.Errorf("unsupported field source: %s", field.Source)
	}
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
