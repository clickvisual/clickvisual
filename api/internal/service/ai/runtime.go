package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

var defaultProvider Provider = OpenAICompatibleProvider{}

func LoadRuntimeConfig() (ProviderConfig, error) {
	if err := ensureAISettingSchema(); err != nil {
		return ProviderConfig{}, err
	}
	current, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return ProviderConfig{}, err
	}
	if current.ID == 0 || current.Enabled == 0 {
		return ProviderConfig{}, fmt.Errorf("ai setting is disabled")
	}
	return ProviderConfig{
		BaseURL:            strings.TrimSpace(current.BaseURL),
		APIKey:             strings.TrimSpace(current.GetAPIKey()),
		Model:              strings.TrimSpace(current.Model),
		TimeoutSeconds:     current.TimeoutSeconds,
		DefaultTemperature: current.DefaultTemperature,
		DefaultMaxTokens:   current.DefaultMaxTokens,
	}, nil
}

func CompleteText(ctx context.Context, messages []Message, options CompletionOptions) (string, error) {
	cfg, err := LoadRuntimeConfig()
	if err != nil {
		return "", err
	}
	return defaultProvider.CompleteText(ctx, cfg, messages, options)
}
