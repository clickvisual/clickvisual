package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func GetSetting() (view.RespAISetting, error) {
	if err := ensureAISettingSchema(); err != nil {
		return view.RespAISetting{}, err
	}
	current, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return view.RespAISetting{}, err
	}
	return toAISettingResp(current), nil
}

func UpdateSetting(uid int, req view.ReqUpdateAISetting) (view.RespAISetting, error) {
	if err := ensureAISettingSchema(); err != nil {
		return view.RespAISetting{}, err
	}
	item := dbmodel.AISetting{
		Enabled:            boolToInt(req.Enabled),
		BaseURL:            strings.TrimSpace(req.BaseURL),
		Model:              strings.TrimSpace(req.Model),
		TimeoutSeconds:     req.TimeoutSeconds,
		MaxInputBytes:      req.MaxInputBytes,
		DefaultTemperature: req.DefaultTemperature,
		DefaultMaxTokens:   req.DefaultMaxTokens,
	}
	if strings.TrimSpace(req.APIKey) != "" {
		item.APIKeyEncrypted = item.SetAPIKey(strings.TrimSpace(req.APIKey))
	}
	if item.TimeoutSeconds <= 0 {
		item.TimeoutSeconds = 5
	}
	if item.MaxInputBytes <= 0 {
		item.MaxInputBytes = 32768
	}
	if item.DefaultMaxTokens <= 0 {
		item.DefaultMaxTokens = 800
	}
	if item.DefaultTemperature < 0 {
		item.DefaultTemperature = 0
	}

	saved, err := dbmodel.AISettingUpsert(uid, item)
	if err != nil {
		return view.RespAISetting{}, err
	}
	return toAISettingResp(saved), nil
}

func TestSetting() (view.RespAISettingTest, error) {
	if err := ensureAISettingSchema(); err != nil {
		return view.RespAISettingTest{}, err
	}
	current, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return view.RespAISettingTest{}, err
	}
	if current.ID == 0 || current.Enabled == 0 {
		return view.RespAISettingTest{}, fmt.Errorf("ai setting is disabled")
	}
	baseURL := strings.TrimRight(strings.TrimSpace(current.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	apiKey := strings.TrimSpace(current.GetAPIKey())
	model := strings.TrimSpace(current.Model)
	if apiKey == "" || model == "" {
		return view.RespAISettingTest{}, fmt.Errorf("ai setting is incomplete")
	}

	timeoutSeconds := current.TimeoutSeconds
	if timeoutSeconds <= 0 {
		timeoutSeconds = 5
	}
	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a connectivity test assistant.",
			},
			{
				"role":    "user",
				"content": "Reply with OK",
			},
		},
		"temperature": 0,
		"max_tokens":  8,
	}
	data, err := json.Marshal(reqBody)
	if err != nil {
		return view.RespAISettingTest{}, err
	}
	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	request, err := http.NewRequest(http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return view.RespAISettingTest{}, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := client.Do(request)
	if err != nil {
		return view.RespAISettingTest{}, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= http.StatusBadRequest {
		return view.RespAISettingTest{}, fmt.Errorf("ai test request failed: %s", resp.Status)
	}
	return view.RespAISettingTest{
		OK:      true,
		Message: "ai provider is reachable",
		Model:   model,
	}, nil
}

func toAISettingResp(item dbmodel.AISetting) view.RespAISetting {
	return view.RespAISetting{
		Enabled:            item.Enabled == 1,
		BaseURL:            item.BaseURL,
		Model:              item.Model,
		TimeoutSeconds:     item.TimeoutSeconds,
		MaxInputBytes:      item.MaxInputBytes,
		DefaultTemperature: item.DefaultTemperature,
		DefaultMaxTokens:   item.DefaultMaxTokens,
		HasAPIKey:          strings.TrimSpace(item.APIKeyEncrypted) != "",
		APIKeyMasked:       maskAPIKey(item.APIKeyEncrypted),
	}
}

func maskAPIKey(encrypted string) string {
	if strings.TrimSpace(encrypted) == "" {
		return ""
	}
	return "已配置"
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
