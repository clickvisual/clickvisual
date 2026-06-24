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

type RespAISettingTest struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
	Model   string `json:"model"`
}
