package view

type RespAISetting struct {
	Enabled            bool    `json:"enabled"`
	BaseURL            string  `json:"baseURL"`
	Model              string  `json:"model"`
	TimeoutSeconds     int     `json:"timeoutSeconds"`
	MaxInputBytes      int     `json:"maxInputBytes"`
	DefaultTemperature float64 `json:"defaultTemperature"`
	DefaultMaxTokens   int     `json:"defaultMaxTokens"`
	HasAPIKey          bool    `json:"hasApiKey"`
	APIKeyMasked       string  `json:"apiKeyMasked"`
}

type ReqUpdateAISetting struct {
	Enabled            bool    `json:"enabled"`
	BaseURL            string  `json:"baseURL"`
	APIKey             string  `json:"apiKey"`
	Model              string  `json:"model"`
	TimeoutSeconds     int     `json:"timeoutSeconds"`
	MaxInputBytes      int     `json:"maxInputBytes"`
	DefaultTemperature float64 `json:"defaultTemperature"`
	DefaultMaxTokens   int     `json:"defaultMaxTokens"`
}

// AIProviderItem is an editable provider entry; a blank APIKey keeps the key
// already stored for the same ID.
type AIProviderItem struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Kind            string `json:"kind"`
	BaseURL         string `json:"baseURL"`
	Model           string `json:"model"`
	ReasoningEffort string `json:"reasoningEffort"`
	Enabled         bool   `json:"enabled"`
	APIKey          string `json:"apiKey"`
}

type AIProviderView struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Kind            string `json:"kind"`
	BaseURL         string `json:"baseURL"`
	Model           string `json:"model"`
	ReasoningEffort string `json:"reasoningEffort"`
	Enabled         bool   `json:"enabled"`
	KeySet          bool   `json:"keySet"`
	KeyHint         string `json:"keyHint"`
}

type RespAIProviders struct {
	Providers []AIProviderView `json:"providers"`
	Chain     []string         `json:"chain"`
	Max       int              `json:"max"`
}

type ReqSaveAIProviders struct {
	Providers []AIProviderItem `json:"providers"`
}

type ReqTestAIProvider struct {
	Provider AIProviderItem `json:"provider"`
}

type RespAIProviderTest struct {
	OK        bool   `json:"ok"`
	LatencyMs int64  `json:"latencyMs"`
	Reply     string `json:"reply"`
	Error     string `json:"error"`
}

type RespAISettingTest struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
	Model   string `json:"model"`
}
