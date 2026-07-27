package query

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildTokenRunRequestUsesRelativeRangeAndRawLogContains(t *testing.T) {
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.Local)
	opts := logsOptions{
		TID:      12,
		Last:     "30m",
		Limit:    100,
		Page:     1,
		Contains: []string{"error", "timeout"},
	}

	req, err := opts.buildRequest(now)

	require.NoError(t, err)
	assert.Equal(t, 12, req.Tid)
	assert.Equal(t, now.Add(-30*time.Minute).Unix(), req.ST)
	assert.Equal(t, now.Unix(), req.ET)
	assert.Equal(t, uint32(1), req.Page)
	assert.Equal(t, uint32(100), req.PageSize)
	require.Len(t, req.Conditions, 2)
	assert.Equal(t, "_raw_log_", req.Conditions[0].Field.FieldKey)
	assert.Equal(t, "contains", string(req.Conditions[0].Operator))
	assert.Equal(t, "error", req.Conditions[0].Value)
}

func TestBuildTokenRunRequestParsesExplicitLocalTimes(t *testing.T) {
	opts := logsOptions{
		TID:   7,
		Start: "2026-07-03 10:00:00",
		End:   "2026-07-03 11:00:00",
		Limit: 10,
		Page:  1,
	}

	req, err := opts.buildRequest(time.Now())

	require.NoError(t, err)
	assert.Equal(t, mustUnix(t, "2026-07-03 10:00:00"), req.ST)
	assert.Equal(t, mustUnix(t, "2026-07-03 11:00:00"), req.ET)
}

func TestRenderLogsAsJSONL(t *testing.T) {
	resp := tokenRunData{
		Logs: []map[string]interface{}{
			{"_raw_log_": "first", "lv": "INFO"},
			{"_raw_log_": "second", "lv": "ERROR"},
		},
	}
	var out bytes.Buffer

	err := renderLogs(&out, resp, "jsonl", "", false)

	require.NoError(t, err)
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	require.Len(t, lines, 2)
	assert.JSONEq(t, `{"_raw_log_":"first","lv":"INFO"}`, lines[0])
	assert.JSONEq(t, `{"_raw_log_":"second","lv":"ERROR"}`, lines[1])
}

func TestRenderLogsAsTextUsesRawLogField(t *testing.T) {
	resp := tokenRunData{
		Logs: []map[string]interface{}{
			{"_raw_log_": "plain log", "lv": "INFO"},
			{"message": "fallback message"},
		},
	}
	var out bytes.Buffer

	err := renderLogs(&out, resp, "text", "", false)

	require.NoError(t, err)
	assert.Equal(t, "plain log\nfallback message\n", out.String())
}

func TestRunTokenQueryPostsBearerTokenAndUnwrapsResponse(t *testing.T) {
	var gotAuth string
	var gotPath string
	var gotReq map[string]interface{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotPath = r.URL.Path
		require.NoError(t, json.NewDecoder(r.Body).Decode(&gotReq))
		_, _ = w.Write([]byte(`{"code":0,"msg":"succ","data":{"count":1,"logs":[{"_raw_log_":"ok"}]}}`))
	}))
	defer srv.Close()

	data, err := runTokenQuery(context.Background(), http.DefaultClient, srv.URL, "cvqt_secret", tokenRunRequest{Tid: 3})

	require.NoError(t, err)
	assert.Equal(t, "Bearer cvqt_secret", gotAuth)
	assert.Equal(t, "/api/v2/open/query/token/run", gotPath)
	assert.Equal(t, float64(3), gotReq["tid"])
	require.Len(t, data.Logs, 1)
	assert.Equal(t, "ok", data.Logs[0]["_raw_log_"])
}

func TestRunTokenQueryReturnsBusinessErrorWithoutDecodingData(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"code":1,"msg":"invalid token","data":"invalid token"}`))
	}))
	defer srv.Close()

	_, err := runTokenQuery(context.Background(), http.DefaultClient, srv.URL, "bad", tokenRunRequest{Tid: 3})

	require.Error(t, err)
	assert.Equal(t, "invalid token", err.Error())
}

func mustUnix(t *testing.T, value string) int64 {
	t.Helper()
	parsed, err := time.ParseInLocation("2006-01-02 15:04:05", value, time.Local)
	require.NoError(t, err)
	return parsed.Unix()
}
