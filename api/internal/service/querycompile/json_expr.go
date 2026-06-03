package querycompile

import (
	"fmt"
	"strings"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func buildJSONValueExpr(baseExpr string, path string, valueType view.QueryValueType) (string, string, bool, error) {
	if path == "" {
		return "", "", false, fmt.Errorf("path is required")
	}
	segments := strings.Split(path, ".")
	if len(segments) == 1 {
		return jsonExtractExpr(baseExpr, segments[0], valueType), "json_path", isHighCostJSONPath(valueType, false), nil
	}
	current := baseExpr
	for _, segment := range segments[:len(segments)-1] {
		current = fmt.Sprintf("JSONExtractRaw(%s, '%s')", current, segment)
	}
	return jsonExtractExpr(current, segments[len(segments)-1], valueType), "json_path", true, nil
}

func buildNestedJSONExpr(baseExpr string, outerPath string, innerPath string, valueType view.QueryValueType) (string, string, bool, error) {
	if outerPath == "" || innerPath == "" {
		return "", "", false, fmt.Errorf("nested json path is incomplete")
	}
	outerExpr := fmt.Sprintf("JSONExtractRaw(%s, '%s')", baseExpr, outerPath)
	return buildJSONValueExpr(outerExpr, innerPath, valueType)
}

func jsonExtractExpr(baseExpr string, field string, valueType view.QueryValueType) string {
	switch valueType {
	case view.QueryValueTypeNumber:
		return fmt.Sprintf("JSONExtractFloat(%s, '%s')", baseExpr, field)
	case view.QueryValueTypeBoolean:
		return fmt.Sprintf("JSONExtractBool(%s, '%s')", baseExpr, field)
	default:
		return fmt.Sprintf("JSONExtractString(%s, '%s')", baseExpr, field)
	}
}

func isHighCostJSONPath(valueType view.QueryValueType, nested bool) bool {
	if nested {
		return true
	}
	return valueType == view.QueryValueTypeString || valueType == view.QueryValueTypeUnknown
}
