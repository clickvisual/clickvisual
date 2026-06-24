package querydetect

import (
	"fmt"
	"sort"
	"strings"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type fieldStats struct {
	Path     string
	Count    int
	Types    map[string]int
	Examples []string
	IsScalar bool
	Source   view.QueryFieldSource
}

func collectFieldStats(rows []map[string]interface{}, draft view.NormalizationDraft) map[string]*fieldStats {
	stats := make(map[string]*fieldStats)
	for _, row := range rows {
		if draft.BodyPath != "" {
			if body, ok := extractObjectAtPath(row, draft.BodyPath, draft); ok {
				collectObjectStats(body, "", view.QueryFieldSourceJSONPath, stats)
			}
		}
		if draft.TagPath != "" {
			if tags, ok := extractPlainObjectAtPath(row, draft.TagPath); ok {
				collectObjectStats(tags, "", view.QueryFieldSourceTagPath, stats)
			}
		}
	}
	return stats
}

func toQueryableFields(stats map[string]*fieldStats, draft view.NormalizationDraft, accelerated map[string]string) []view.QueryableField {
	out := make([]view.QueryableField, 0, len(stats))
	for _, item := range stats {
		valueType := inferValueType(item.Types)
		operators := operatorsForType(valueType, item.IsScalar)
		acceleratedCol, isAccelerated := accelerated[item.Path]
		status := "none"
		if isAccelerated {
			status = "materialized"
		}
		out = append(out, view.QueryableField{
			FieldKey:             item.Path,
			DisplayName:          item.Path,
			Path:                 item.Path,
			Source:               item.Source,
			ValueType:            valueType,
			IsScalar:             item.IsScalar,
			Coverage:             0, // 当前阶段只冻结模型和最小识别；覆盖率在后续统计增强
			Stability:            stabilityScore(item.Types),
			RecommendedOperators: operators,
			IsAccelerated:        isAccelerated,
			AccelerationStatus:   status,
			Examples:             item.Examples,
		})
		if isAccelerated {
			_ = acceleratedCol
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Path < out[j].Path
	})
	return out
}

func collectObjectStats(obj map[string]interface{}, prefix string, source view.QueryFieldSource, stats map[string]*fieldStats) {
	for key, value := range obj {
		path := key
		if prefix != "" {
			path = prefix + "." + key
		}
		currentType := valueKind(value)
		entry, ok := stats[path]
		if !ok {
			entry = &fieldStats{
				Path:     path,
				Types:    make(map[string]int),
				Examples: make([]string, 0, 3),
				IsScalar: currentType != "object" && currentType != "array",
				Source:   source,
			}
			stats[path] = entry
		}
		entry.Count++
		entry.Types[currentType]++
		if len(entry.Examples) < 3 {
			entry.Examples = append(entry.Examples, exampleValue(value))
		}
		if nested, ok := value.(map[string]interface{}); ok {
			collectObjectStats(nested, path, source, stats)
		}
	}
}

func extractObjectAtPath(row map[string]interface{}, path string, draft view.NormalizationDraft) (map[string]interface{}, bool) {
	if draft.NeedNestedJSON && draft.NestedJSONPath == path {
		return parseNestedJSONAtPath(row, path)
	}
	return extractPlainObjectAtPath(row, path)
}

func extractPlainObjectAtPath(row map[string]interface{}, path string) (map[string]interface{}, bool) {
	val, ok := getValueByPath(row, path)
	if !ok {
		return nil, false
	}
	obj, ok := val.(map[string]interface{})
	return obj, ok
}

func inferValueType(types map[string]int) view.QueryValueType {
	if len(types) == 0 {
		return view.QueryValueTypeUnknown
	}
	if len(types) > 1 {
		return view.QueryValueTypeUnknown
	}
	for kind := range types {
		switch kind {
		case "string", "json_string":
			return view.QueryValueTypeString
		case "number":
			return view.QueryValueTypeNumber
		case "boolean":
			return view.QueryValueTypeBoolean
		case "datetime":
			return view.QueryValueTypeDatetime
		default:
			return view.QueryValueTypeUnknown
		}
	}
	return view.QueryValueTypeUnknown
}

func operatorsForType(valueType view.QueryValueType, isScalar bool) []view.QueryOperator {
	if !isScalar {
		return []view.QueryOperator{view.QueryOperatorExists, view.QueryOperatorNotExists}
	}
	switch valueType {
	case view.QueryValueTypeString:
		return []view.QueryOperator{
			view.QueryOperatorEQ, view.QueryOperatorNEQ, view.QueryOperatorContains,
			view.QueryOperatorNotContains, view.QueryOperatorIn, view.QueryOperatorExists, view.QueryOperatorNotExists,
		}
	case view.QueryValueTypeNumber:
		return []view.QueryOperator{
			view.QueryOperatorEQ, view.QueryOperatorNEQ, view.QueryOperatorGT, view.QueryOperatorGTE,
			view.QueryOperatorLT, view.QueryOperatorLTE, view.QueryOperatorBetween, view.QueryOperatorExists, view.QueryOperatorNotExists,
		}
	case view.QueryValueTypeBoolean:
		return []view.QueryOperator{
			view.QueryOperatorIsTrue, view.QueryOperatorIsFalse, view.QueryOperatorExists, view.QueryOperatorNotExists,
		}
	case view.QueryValueTypeDatetime:
		return []view.QueryOperator{
			view.QueryOperatorEQ, view.QueryOperatorGT, view.QueryOperatorGTE,
			view.QueryOperatorLT, view.QueryOperatorLTE, view.QueryOperatorBetween,
		}
	default:
		return []view.QueryOperator{view.QueryOperatorExists, view.QueryOperatorNotExists}
	}
}

func stabilityScore(types map[string]int) float64 {
	if len(types) == 0 {
		return 0
	}
	if len(types) == 1 {
		return 1
	}
	total := 0
	maxCount := 0
	for _, count := range types {
		total += count
		if count > maxCount {
			maxCount = count
		}
	}
	return float64(maxCount) / float64(total)
}

func exampleValue(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	default:
		return fmt.Sprintf("%v", val)
	}
}

func collectAllPaths(rows []map[string]interface{}) []string {
	set := make(map[string]struct{})
	for _, row := range rows {
		collectPaths(row, "", set)
	}
	out := make([]string, 0, len(set))
	for path := range set {
		out = append(out, path)
	}
	sort.Strings(out)
	return out
}

func collectPaths(obj map[string]interface{}, prefix string, set map[string]struct{}) {
	for key, value := range obj {
		path := key
		if prefix != "" {
			path = prefix + "." + key
		}
		set[path] = struct{}{}
		if nested, ok := value.(map[string]interface{}); ok {
			collectPaths(nested, path, set)
		}
	}
}

func getValueByPath(row map[string]interface{}, path string) (interface{}, bool) {
	current := interface{}(row)
	for _, segment := range strings.Split(path, ".") {
		obj, ok := current.(map[string]interface{})
		if !ok {
			return nil, false
		}
		next, ok := obj[segment]
		if !ok {
			return nil, false
		}
		current = next
	}
	return current, true
}
