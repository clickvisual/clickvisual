package ai

import (
	"context"
	"fmt"
	"strings"

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
	current, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return view.RespAISetting{}, err
	}
	item := dbmodel.AISetting{
		Enabled:            boolToInt(req.Enabled),
		BaseURL:            strings.TrimSpace(req.BaseURL),
		Model:              strings.TrimSpace(req.Model),
		ProvidersImported:  current.ProvidersImported,
		TimeoutSeconds:     req.TimeoutSeconds,
		MaxInputBytes:      req.MaxInputBytes,
		DefaultTemperature: req.DefaultTemperature,
		DefaultMaxTokens:   req.DefaultMaxTokens,
	}
	if item.BaseURL == "" && item.Model == "" {
		item.Enabled = current.Enabled
		item.BaseURL = current.BaseURL
		item.Model = current.Model
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
	_, chain, err := loadRuntime()
	if err != nil {
		return view.RespAISettingTest{}, err
	}
	for i := range chain {
		chain[i].TimeoutSeconds = max(chain[i].TimeoutSeconds, minTestTimeout)
	}
	_, used, err := completeWithFallback(context.Background(), chain, connectivityMessages(), CompletionOptions{MaxTokens: 256})
	if err != nil {
		return view.RespAISettingTest{}, err
	}
	return view.RespAISettingTest{
		OK:      true,
		Message: fmt.Sprintf("ai provider %s is reachable", used.Key),
		Model:   used.Model,
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
