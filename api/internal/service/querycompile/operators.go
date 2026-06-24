package querycompile

import (
	"fmt"
	"strings"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func compileOperator(expr string, op view.QueryOperator, value interface{}, valueTo interface{}, typ view.QueryValueType) (string, error) {
	switch typ {
	case view.QueryValueTypeBoolean:
		if op != view.QueryOperatorIsTrue && op != view.QueryOperatorIsFalse && op != view.QueryOperatorExists && op != view.QueryOperatorNotExists {
			return "", fmt.Errorf("operator %s is not supported for boolean field", op)
		}
	}
	switch op {
	case view.QueryOperatorEQ:
		return fmt.Sprintf("%s = %s", expr, quoteValue(value, typ)), nil
	case view.QueryOperatorNEQ:
		return fmt.Sprintf("%s != %s", expr, quoteValue(value, typ)), nil
	case view.QueryOperatorContains:
		if typ != view.QueryValueTypeString && typ != view.QueryValueTypeUnknown {
			return "", fmt.Errorf("operator %s is not supported for %s field", op, typ)
		}
		return fmt.Sprintf("%s LIKE '%%%s%%'", expr, escapeLikeString(value)), nil
	case view.QueryOperatorNotContains:
		if typ != view.QueryValueTypeString && typ != view.QueryValueTypeUnknown {
			return "", fmt.Errorf("operator %s is not supported for %s field", op, typ)
		}
		return fmt.Sprintf("%s NOT LIKE '%%%s%%'", expr, escapeLikeString(value)), nil
	case view.QueryOperatorGT, view.QueryOperatorGTE, view.QueryOperatorLT, view.QueryOperatorLTE:
		return fmt.Sprintf("%s %s %s", expr, op, quoteValue(value, typ)), nil
	case view.QueryOperatorBetween:
		return fmt.Sprintf("%s >= %s AND %s <= %s", expr, quoteValue(value, typ), expr, quoteValue(valueTo, typ)), nil
	case view.QueryOperatorExists:
		return fmt.Sprintf("isNotNull(%s)", expr), nil
	case view.QueryOperatorNotExists:
		return fmt.Sprintf("isNull(%s)", expr), nil
	case view.QueryOperatorIsTrue:
		return fmt.Sprintf("%s = true", expr), nil
	case view.QueryOperatorIsFalse:
		return fmt.Sprintf("%s = false", expr), nil
	case view.QueryOperatorIn:
		values, ok := value.([]interface{})
		if !ok {
			if ss, okString := value.([]string); okString {
				items := make([]string, 0, len(ss))
				for _, item := range ss {
					items = append(items, quoteValue(item, typ))
				}
				return fmt.Sprintf("%s IN (%s)", expr, strings.Join(items, ", ")), nil
			}
			return "", fmt.Errorf("operator %s requires array value", op)
		}
		items := make([]string, 0, len(values))
		for _, item := range values {
			items = append(items, quoteValue(item, typ))
		}
		return fmt.Sprintf("%s IN (%s)", expr, strings.Join(items, ", ")), nil
	default:
		return "", fmt.Errorf("unsupported operator: %s", op)
	}
}

func quoteValue(value interface{}, typ view.QueryValueType) string {
	switch typ {
	case view.QueryValueTypeNumber:
		return fmt.Sprintf("%v", value)
	case view.QueryValueTypeBoolean:
		return fmt.Sprintf("%v", value)
	default:
		return fmt.Sprintf("'%s'", escapeString(fmt.Sprintf("%v", value)))
	}
}

func escapeLikeString(value interface{}) string {
	return escapeString(fmt.Sprintf("%v", value))
}

func escapeString(value string) string {
	return strings.ReplaceAll(value, "'", "\\'")
}
