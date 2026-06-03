package querydetect

import (
	"encoding/json"
	"strings"
)

func parseNestedJSONAtPath(row map[string]interface{}, path string) (map[string]interface{}, bool) {
	val, ok := getValueByPath(row, path)
	if !ok {
		return nil, false
	}
	raw, ok := val.(string)
	if !ok || !looksLikeJSON(raw) {
		return nil, false
	}
	out := make(map[string]interface{})
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &out); err != nil {
		return nil, false
	}
	return out, true
}
