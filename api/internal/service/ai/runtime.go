package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

// loadRuntime returns the shared AI parameters and the enabled providers in
// call order. AI is available as long as one provider is enabled.
func loadRuntime() (dbmodel.AISetting, []ProviderConfig, error) {
	if err := ensureAISettingSchema(); err != nil {
		return dbmodel.AISetting{}, nil, err
	}
	if err := importLegacyProvider(); err != nil {
		return dbmodel.AISetting{}, nil, err
	}
	setting, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return dbmodel.AISetting{}, nil, err
	}
	rows, err := dbmodel.AIProviderList(invoker.Db)
	if err != nil {
		return dbmodel.AISetting{}, nil, err
	}
	chain := make([]ProviderConfig, 0, len(rows))
	for _, row := range rows {
		if row.Enabled != 1 {
			continue
		}
		chain = append(chain, ProviderConfig{
			Key:                row.ProviderKey,
			Name:               row.Name,
			Kind:               row.Kind,
			BaseURL:            row.BaseURL,
			APIKey:             dbmodel.DecryptAIKey(row.APIKeyEncrypted),
			Model:              row.Model,
			ReasoningEffort:    row.ReasoningEffort,
			TimeoutSeconds:     setting.TimeoutSeconds,
			DefaultTemperature: setting.DefaultTemperature,
			DefaultMaxTokens:   setting.DefaultMaxTokens,
		})
	}
	if len(chain) == 0 {
		return setting, nil, fmt.Errorf("没有启用的 AI 模型，请在配置中心 / 模型配置中添加")
	}
	return setting, chain, nil
}

func CompleteText(ctx context.Context, messages []Message, options CompletionOptions) (string, error) {
	_, chain, err := loadRuntime()
	if err != nil {
		return "", err
	}
	content, _, err := completeWithFallback(ctx, chain, messages, options)
	return content, err
}

// completeWithFallback tries each provider in order and returns the first
// answer together with the provider that produced it.
func completeWithFallback(ctx context.Context, chain []ProviderConfig, messages []Message, options CompletionOptions) (string, ProviderConfig, error) {
	failures := make([]string, 0, len(chain))
	for _, cfg := range chain {
		content, err := providerFor(cfg.Kind).CompleteText(ctx, cfg, messages, options)
		if err == nil {
			return content, cfg, nil
		}
		if ctx.Err() != nil {
			return "", cfg, ctx.Err()
		}
		elog.Warn("ai provider failed, trying next", elog.String("provider", cfg.Key), elog.String("error", err.Error()))
		failures = append(failures, fmt.Sprintf("%s: %v", cfg.Key, err))
	}
	return "", ProviderConfig{}, fmt.Errorf("所有 AI 模型调用失败：%s", strings.Join(failures, "; "))
}
