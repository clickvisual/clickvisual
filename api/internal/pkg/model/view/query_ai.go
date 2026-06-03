package view

type AIDecision struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type AISuggestion struct {
	Type        string      `json:"type"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Payload     interface{} `json:"payload,omitempty"`
}

type AIDraftResponse struct {
	Summary                  string         `json:"summary"`
	Decisions                []AIDecision   `json:"decisions"`
	Risks                    []QueryWarning `json:"risks"`
	Suggestions              []AISuggestion `json:"suggestions"`
	RequiresUserConfirmation bool           `json:"requiresUserConfirmation"`
}
