package querydetect

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var timeNameScore = map[string]float64{
	"_time_":      0.98,
	"time":        0.95,
	"ts":          0.93,
	"timestamp":   0.93,
	"createdtime": 0.90,
	"eventtime":   0.90,
}

var bodyNameScore = map[string]float64{
	"body":     0.98,
	"content":  0.95,
	"contents": 0.92,
	"log":      0.88,
	"message":  0.85,
}

var tagNameScore = map[string]float64{
	"tags":       0.98,
	"properties": 0.93,
	"labels":     0.90,
	"attrs":      0.88,
}

func detectTimeCandidates(rows []map[string]interface{}) []view.Candidate {
	paths := collectAllPaths(rows)
	out := make([]view.Candidate, 0)
	for _, path := range paths {
		name := strings.ToLower(lastSegment(path))
		score, ok := timeNameScore[name]
		if !ok {
			continue
		}
		coverage, kind := detectPathCoverageAndType(rows, path)
		if coverage == 0 {
			continue
		}
		confidence := score
		if isTimeLikeKind(kind) {
			confidence += 0.02
		} else {
			confidence -= 0.12
		}
		out = append(out, view.Candidate{
			Path:       path,
			Label:      fmt.Sprintf("%s (%s)", path, kind),
			Confidence: clampScore(confidence * coverage),
			Reason:     "字段名和样本值都符合时间字段特征",
		})
	}
	return sortCandidates(out)
}

func detectBodyCandidates(rows []map[string]interface{}) []view.Candidate {
	paths := collectAllPaths(rows)
	out := make([]view.Candidate, 0)
	for _, path := range paths {
		name := strings.ToLower(lastSegment(path))
		score, ok := bodyNameScore[name]
		if !ok {
			continue
		}
		coverage, kind := detectPathCoverageAndType(rows, path)
		if coverage == 0 {
			continue
		}
		reason := "字段名符合正文候选特征"
		confidence := score * coverage
		if kind == "object" {
			confidence += 0.03
			reason = "字段名符合正文候选特征，且样本值是对象"
		}
		if kind == "json_string" {
			confidence += 0.05
			reason = "字段名符合正文候选特征，且样本值看起来是 JSON 字符串"
		}
		out = append(out, view.Candidate{
			Path:       path,
			Label:      fmt.Sprintf("%s (%s)", path, kind),
			Confidence: clampScore(confidence),
			Reason:     reason,
		})
	}
	return sortCandidates(out)
}

func detectTagCandidates(rows []map[string]interface{}) []view.Candidate {
	paths := collectAllPaths(rows)
	out := make([]view.Candidate, 0)
	for _, path := range paths {
		name := strings.ToLower(lastSegment(path))
		score, ok := tagNameScore[name]
		if !ok {
			continue
		}
		coverage, kind := detectPathCoverageAndType(rows, path)
		if coverage == 0 || kind != "object" {
			continue
		}
		out = append(out, view.Candidate{
			Path:       path,
			Label:      fmt.Sprintf("%s (%s)", path, kind),
			Confidence: clampScore(score * coverage),
			Reason:     "字段名符合标签候选特征，且样本值是对象",
		})
	}
	return sortCandidates(out)
}

func detectNestedJSONCandidates(rows []map[string]interface{}) []view.Candidate {
	paths := collectAllPaths(rows)
	out := make([]view.Candidate, 0)
	for _, path := range paths {
		total := 0
		valid := 0
		for _, row := range rows {
			val, ok := getValueByPath(row, path)
			if !ok {
				continue
			}
			s, ok := val.(string)
			if !ok {
				continue
			}
			total++
			if looksLikeJSON(s) {
				valid++
			}
		}
		if total == 0 || valid == 0 {
			continue
		}
		confidence := clampScore(float64(valid) / float64(total))
		out = append(out, view.Candidate{
			Path:       path,
			Label:      fmt.Sprintf("%s (json_string)", path),
			Confidence: confidence,
			Reason:     "字符串字段可稳定解析为 JSON，适合做二次 JSON 解析",
		})
	}
	return sortCandidates(out)
}

func detectRisks(rows []map[string]interface{}) []view.QueryWarning {
	warnings := make([]view.QueryWarning, 0)
	bodyCandidates := detectBodyCandidates(rows)
	if len(bodyCandidates) == 0 {
		warnings = append(warnings, view.QueryWarning{
			Code:    "body_candidate_missing",
			Level:   "warning",
			Message: "未识别出高置信度正文候选字段，后续可能需要人工确认",
		})
	}
	timeCandidates := detectTimeCandidates(rows)
	if len(timeCandidates) == 0 {
		warnings = append(warnings, view.QueryWarning{
			Code:    "time_candidate_missing",
			Level:   "warning",
			Message: "未识别出高置信度时间候选字段，后续可能需要人工确认",
		})
	}
	return warnings
}

func detectPathCoverageAndType(rows []map[string]interface{}, path string) (float64, string) {
	count := 0
	kind := ""
	for _, row := range rows {
		val, ok := getValueByPath(row, path)
		if !ok {
			continue
		}
		count++
		currentKind := valueKind(val)
		if kind == "" {
			kind = currentKind
		}
	}
	if count == 0 {
		return 0, ""
	}
	return float64(count) / float64(len(rows)), kind
}

func valueKind(v interface{}) string {
	switch val := v.(type) {
	case map[string]interface{}:
		return "object"
	case []interface{}:
		return "array"
	case string:
		if looksLikeJSON(val) {
			return "json_string"
		}
		if isRFC3339String(val) {
			return "datetime"
		}
		return "string"
	case bool:
		return "boolean"
	case float64, float32, int, int32, int64, uint, uint32, uint64, json.Number:
		if isUnixTimestampLike(v) {
			return "datetime"
		}
		return "number"
	default:
		return "unknown"
	}
}

func looksLikeJSON(s string) bool {
	trimmed := strings.TrimSpace(s)
	if !(strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) &&
		!(strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) {
		return false
	}
	var tmp interface{}
	return json.Unmarshal([]byte(trimmed), &tmp) == nil
}

func isRFC3339String(s string) bool {
	_, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(s))
	return err == nil
}

func isUnixTimestampLike(v interface{}) bool {
	n, ok := toFloat64(v)
	if !ok {
		return false
	}
	return n > 946684800 && n < 4102444800000
}

func toFloat64(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int32:
		return float64(val), true
	case int64:
		return float64(val), true
	case uint:
		return float64(val), true
	case uint32:
		return float64(val), true
	case uint64:
		return float64(val), true
	case json.Number:
		f, err := val.Float64()
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(val, 64)
		return f, err == nil
	default:
		return 0, false
	}
}

func isTimeLikeKind(kind string) bool {
	return kind == "datetime" || kind == "number"
}

func clampScore(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func sortCandidates(in []view.Candidate) []view.Candidate {
	sort.SliceStable(in, func(i, j int) bool {
		if in[i].Confidence == in[j].Confidence {
			return in[i].Path < in[j].Path
		}
		return in[i].Confidence > in[j].Confidence
	})
	return in
}

func lastSegment(path string) string {
	parts := strings.Split(path, ".")
	return parts[len(parts)-1]
}
