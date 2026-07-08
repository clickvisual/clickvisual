package query

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const tokenRunPath = "/api/v2/open/query/token/run"

type tokenRunRequest = view.QueryRequestV2

type tokenRunData struct {
	Count uint64                   `json:"count"`
	Cost  int64                    `json:"cost"`
	Keys  []view.QueryLogsField    `json:"keys"`
	Logs  []map[string]interface{} `json:"logs"`
	Query string                   `json:"query"`
	SQL   string                   `json:"sql"`
	Plan  view.QueryPlan           `json:"plan"`
}

type tokenRunEnvelope struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data json.RawMessage `json:"data"`
}

func runTokenQuery(ctx context.Context, client *http.Client, addr string, token string, req tokenRunRequest) (tokenRunData, error) {
	if client == nil {
		client = http.DefaultClient
	}
	body, err := json.Marshal(req)
	if err != nil {
		return tokenRunData{}, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointURL(addr), bytes.NewReader(body))
	if err != nil {
		return tokenRunData{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+strings.TrimSpace(token))

	resp, err := client.Do(httpReq)
	if err != nil {
		return tokenRunData{}, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return tokenRunData{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return tokenRunData{}, fmt.Errorf("http %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var envelope tokenRunEnvelope
	if err = json.Unmarshal(respBody, &envelope); err != nil {
		return tokenRunData{}, fmt.Errorf("decode response: %w", err)
	}
	if envelope.Code != 0 {
		if envelope.Msg == "" {
			envelope.Msg = "query failed"
		}
		return tokenRunData{}, fmt.Errorf("%s", envelope.Msg)
	}
	var data tokenRunData
	if len(envelope.Data) == 0 {
		return tokenRunData{}, nil
	}
	if err = json.Unmarshal(envelope.Data, &data); err != nil {
		return tokenRunData{}, fmt.Errorf("decode response data: %w", err)
	}
	return data, nil
}

func endpointURL(addr string) string {
	return strings.TrimRight(strings.TrimSpace(addr), "/") + tokenRunPath
}

func renderLogs(w io.Writer, data tokenRunData, format string, textField string, debug bool) error {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "jsonl":
		enc := json.NewEncoder(w)
		for _, row := range data.Logs {
			if err := enc.Encode(row); err != nil {
				return err
			}
		}
	case "json":
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		if debug {
			return enc.Encode(data)
		}
		return enc.Encode(data.Logs)
	case "text":
		for _, row := range data.Logs {
			fmt.Fprintln(w, textValue(row, textField))
		}
	default:
		return fmt.Errorf("unsupported format %q", format)
	}
	return nil
}

func textValue(row map[string]interface{}, textField string) string {
	if textField != "" {
		if value, ok := row[textField]; ok {
			return fmt.Sprint(value)
		}
	}
	for _, key := range []string{"_raw_log_", "_raw_log", "raw_log", "message", "msg", "log"} {
		if value, ok := row[key]; ok {
			return fmt.Sprint(value)
		}
	}
	body, err := json.Marshal(row)
	if err != nil {
		return fmt.Sprint(row)
	}
	return string(body)
}

func writeDebug(w io.Writer, data tokenRunData) {
	if w == nil {
		return
	}
	fmt.Fprintf(w, "count=%d cost_ms=%d\n", data.Count, data.Cost)
	if strings.TrimSpace(data.SQL) != "" {
		fmt.Fprintf(w, "sql=%s\n", data.SQL)
	}
	for _, warning := range data.Plan.Warnings {
		fmt.Fprintf(w, "warning=%s:%s\n", warning.Code, warning.Message)
	}
}

func defaultTimeNow() time.Time {
	return time.Now()
}
