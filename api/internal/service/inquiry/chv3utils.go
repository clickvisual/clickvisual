package inquiry

import (
	"encoding/json"
	"strings"
	"time"
)

// isTrace yes 1 no 0
func isTrace(res map[string]interface{}) int {
	if key, keyOk := res["_key"]; !keyOk || key == "" {
		return 0
	}
	rawLog, rawLogOk := res["_raw_log_"]
	if !rawLogOk {
		return 0
	}
	jj := JaegerJson{}
	_ = json.Unmarshal([]byte(strings.ReplaceAll(rawLog.(string), "\\\"", "\"")), &jj)
	if jj.TraceId != "" &&
		jj.SpanId != "" &&
		jj.Duration != "" {
		return 1
	}
	return 0
}

type JaegerJson struct {
	TraceId       string    `json:"traceId"`
	SpanId        string    `json:"spanId"`
	OperationName string    `json:"operationName"`
	StartTime     time.Time `json:"startTime"`
	Duration      string    `json:"duration"`
	Tags          []struct {
		Key    string `json:"key"`
		VStr   string `json:"vStr,omitempty"`
		VType  string `json:"vType,omitempty"`
		VInt64 string `json:"vInt64,omitempty"`
	} `json:"tags"`
	Process struct {
		ServiceName string `json:"serviceName"`
		Tags        []struct {
			Key  string `json:"key"`
			VStr string `json:"vStr"`
		} `json:"tags"`
	} `json:"process"`
}
