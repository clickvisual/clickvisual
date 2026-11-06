package ai

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const (
	MaxProviders        = 10
	maxProviderNameLen  = 64
	maxProviderModelLen = 128
	minTestTimeout      = 15

	legacyProviderKey  = "default"
	legacyProviderName = "默认模型"
)

var (
	providerKeyPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,31}$`)
	// ReasoningEfforts are the accepted reasoning_effort values for the
	// OpenAI-compatible kind; blank leaves the model default.
	ReasoningEfforts = []string{"minimal", "low", "medium", "high"}
)

func ListProviders() (view.RespAIProviders, error) {
	if err := ensureAISettingSchema(); err != nil {
		return view.RespAIProviders{}, err
	}
	if err := importLegacyProvider(); err != nil {
		return view.RespAIProviders{}, err
	}
	rows, err := dbmodel.AIProviderList(invoker.Db)
	if err != nil {
		return view.RespAIProviders{}, err
	}
	resp := view.RespAIProviders{
		Providers: make([]view.AIProviderView, 0, len(rows)),
		Chain:     []string{},
		Max:       MaxProviders,
	}
	for _, row := range rows {
		resp.Providers = append(resp.Providers, providerView(row))
		if row.Enabled == 1 {
			resp.Chain = append(resp.Chain, row.ProviderKey)
		}
	}
	return resp, nil
}

func SaveProviders(uid int, req view.ReqSaveAIProviders) (view.RespAIProviders, error) {
	if err := ensureAISettingSchema(); err != nil {
		return view.RespAIProviders{}, err
	}
	if len(req.Providers) > MaxProviders {
		return view.RespAIProviders{}, fmt.Errorf("最多配置 %d 个模型", MaxProviders)
	}
	prev, err := storedProviderKeys()
	if err != nil {
		return view.RespAIProviders{}, err
	}
	creators, err := storedProviderCreators()
	if err != nil {
		return view.RespAIProviders{}, err
	}

	seen := make(map[string]bool, len(req.Providers))
	rows := make([]dbmodel.AIProvider, 0, len(req.Providers))
	for i, item := range req.Providers {
		normalized, err := normalizeProvider(item, prev)
		if err != nil {
			return view.RespAIProviders{}, fmt.Errorf("第 %d 个模型：%w", i+1, err)
		}
		if seen[normalized.ID] {
			return view.RespAIProviders{}, fmt.Errorf("第 %d 个模型：ID %q 重复", i+1, normalized.ID)
		}
		seen[normalized.ID] = true
		creator, ok := creators[normalized.ID]
		if !ok {
			creator = uid
		}
		rows = append(rows, dbmodel.AIProvider{
			ProviderKey:     normalized.ID,
			Name:            normalized.Name,
			Kind:            normalized.Kind,
			BaseURL:         normalized.BaseURL,
			Model:           normalized.Model,
			ReasoningEffort: normalized.ReasoningEffort,
			APIKeyEncrypted: dbmodel.EncryptAIKey(normalized.APIKey),
			Enabled:         boolToInt(normalized.Enabled),
			CreatorUid:      creator,
			UpdaterUid:      uid,
		})
	}
	if err := dbmodel.AIProviderReplaceAll(invoker.Db, rows); err != nil {
		return view.RespAIProviders{}, err
	}
	if err := markProvidersImported(); err != nil {
		return view.RespAIProviders{}, err
	}
	return ListProviders()
}

func TestProvider(req view.ReqTestAIProvider) (view.RespAIProviderTest, error) {
	if err := ensureAISettingSchema(); err != nil {
		return view.RespAIProviderTest{}, err
	}
	prev, err := storedProviderKeys()
	if err != nil {
		return view.RespAIProviderTest{}, err
	}
	normalized, err := normalizeProvider(req.Provider, prev)
	if err != nil {
		return view.RespAIProviderTest{}, err
	}
	setting, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return view.RespAIProviderTest{}, err
	}
	cfg := providerConfig(normalized, setting)
	cfg.TimeoutSeconds = max(cfg.TimeoutSeconds, minTestTimeout)

	started := time.Now()
	reply, err := providerFor(cfg.Kind).CompleteText(context.Background(), cfg, connectivityMessages(), CompletionOptions{MaxTokens: 256})
	resp := view.RespAIProviderTest{LatencyMs: time.Since(started).Milliseconds()}
	if err != nil {
		resp.Error = err.Error()
		return resp, nil
	}
	resp.OK = true
	resp.Reply = truncateRunes(reply, 80)
	return resp, nil
}

func connectivityMessages() []Message {
	return []Message{
		{Role: "system", Content: "You are a connectivity test assistant."},
		{Role: "user", Content: "Reply with OK"},
	}
}

// importLegacyProvider copies the old single-model setting into the provider
// list once, so existing deployments keep working after the upgrade.
func importLegacyProvider() error {
	setting, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return err
	}
	if setting.ID == 0 || setting.ProvidersImported == 1 {
		return nil
	}
	apiKey := strings.TrimSpace(setting.GetAPIKey())
	model := strings.TrimSpace(setting.Model)
	if apiKey != "" && model != "" {
		rows, err := dbmodel.AIProviderList(invoker.Db)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			baseURL := strings.TrimRight(strings.TrimSpace(setting.BaseURL), "/")
			if baseURL == "" {
				baseURL = "https://api.openai.com"
			}
			legacy := []dbmodel.AIProvider{{
				ProviderKey:     legacyProviderKey,
				Name:            legacyProviderName,
				Kind:            ProviderKindOpenAI,
				BaseURL:         baseURL,
				Model:           model,
				APIKeyEncrypted: setting.APIKeyEncrypted,
				Enabled:         setting.Enabled,
				CreatorUid:      setting.CreatorUid,
				UpdaterUid:      setting.UpdaterUid,
			}}
			if err := dbmodel.AIProviderReplaceAll(invoker.Db, legacy); err != nil {
				return err
			}
		}
	}
	return markProvidersImported()
}

func markProvidersImported() error {
	setting, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return err
	}
	if setting.ID == 0 || setting.ProvidersImported == 1 {
		return nil
	}
	return dbmodel.AISettingUpdate(invoker.Db, map[string]interface{}{"providers_imported": 1})
}

func storedProviderKeys() (map[string]string, error) {
	rows, err := dbmodel.AIProviderList(invoker.Db)
	if err != nil {
		return nil, err
	}
	keys := make(map[string]string, len(rows))
	for _, row := range rows {
		keys[row.ProviderKey] = dbmodel.DecryptAIKey(row.APIKeyEncrypted)
	}
	return keys, nil
}

func storedProviderCreators() (map[string]int, error) {
	rows, err := dbmodel.AIProviderList(invoker.Db)
	if err != nil {
		return nil, err
	}
	creators := make(map[string]int, len(rows))
	for _, row := range rows {
		creators[row.ProviderKey] = row.CreatorUid
	}
	return creators, nil
}

func normalizeProvider(item view.AIProviderItem, storedKeys map[string]string) (view.AIProviderItem, error) {
	item.ID = strings.ToLower(strings.TrimSpace(item.ID))
	item.Name = strings.TrimSpace(item.Name)
	item.Kind = strings.ToLower(strings.TrimSpace(item.Kind))
	item.BaseURL = strings.TrimRight(strings.TrimSpace(item.BaseURL), "/")
	item.Model = strings.TrimSpace(item.Model)
	item.APIKey = strings.TrimSpace(item.APIKey)
	item.ReasoningEffort = strings.ToLower(strings.TrimSpace(item.ReasoningEffort))

	if !providerKeyPattern.MatchString(item.ID) {
		return item, errors.New("ID 只能包含小写字母、数字、- 和 _，最长 32 位")
	}
	if item.Name == "" {
		item.Name = item.ID
	}
	if utf8.RuneCountInString(item.Name) > maxProviderNameLen {
		return item, fmt.Errorf("名称最长 %d 个字符", maxProviderNameLen)
	}
	if item.Kind == "" {
		item.Kind = ProviderKindOpenAI
	}
	if item.Kind != ProviderKindOpenAI && item.Kind != ProviderKindOpenAIResponses && item.Kind != ProviderKindAnthropic {
		return item, errors.New("协议只能是 openai、openai-responses 或 anthropic")
	}
	parsed, err := url.Parse(item.BaseURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return item, errors.New("Base URL 需要以 http:// 或 https:// 开头")
	}
	if item.Model == "" || len(item.Model) > maxProviderModelLen {
		return item, fmt.Errorf("模型名必填，最长 %d 个字符", maxProviderModelLen)
	}
	if item.Kind == ProviderKindAnthropic {
		item.ReasoningEffort = ""
	}
	if item.ReasoningEffort != "" && !slices.Contains(ReasoningEfforts, item.ReasoningEffort) {
		return item, fmt.Errorf("推理强度只能是 %s 或留空", strings.Join(ReasoningEfforts, "/"))
	}
	if item.APIKey == "" {
		item.APIKey = storedKeys[item.ID]
	}
	if item.APIKey == "" {
		return item, errors.New("API Key 必填")
	}
	return item, nil
}

func providerView(row dbmodel.AIProvider) view.AIProviderView {
	apiKey := dbmodel.DecryptAIKey(row.APIKeyEncrypted)
	return view.AIProviderView{
		ID:              row.ProviderKey,
		Name:            row.Name,
		Kind:            row.Kind,
		BaseURL:         row.BaseURL,
		Model:           row.Model,
		ReasoningEffort: row.ReasoningEffort,
		Enabled:         row.Enabled == 1,
		KeySet:          apiKey != "",
		KeyHint:         keyHint(apiKey),
	}
}

func providerConfig(item view.AIProviderItem, setting dbmodel.AISetting) ProviderConfig {
	return ProviderConfig{
		Key:                item.ID,
		Name:               item.Name,
		Kind:               item.Kind,
		BaseURL:            item.BaseURL,
		APIKey:             item.APIKey,
		Model:              item.Model,
		ReasoningEffort:    item.ReasoningEffort,
		TimeoutSeconds:     setting.TimeoutSeconds,
		DefaultTemperature: setting.DefaultTemperature,
		DefaultMaxTokens:   setting.DefaultMaxTokens,
	}
}

func keyHint(key string) string {
	if len(key) <= 8 {
		return ""
	}
	return key[len(key)-4:]
}

func truncateRunes(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit]) + "…"
}
