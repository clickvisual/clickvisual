package view

type TroubleshootLink struct {
	Tid        int    `json:"tid"`
	InstanceID int    `json:"instanceId,omitempty"`
	Database   string `json:"database,omitempty"`
	Table      string `json:"table,omitempty"`
	Query      string `json:"query,omitempty"`
	ST         int64  `json:"st,omitempty"`
	ET         int64  `json:"et,omitempty"`
}

type RespTroubleshootPending struct {
	Tool    string `json:"tool"`
	Summary string `json:"summary"`
}

type TroubleshootResult struct {
	Count   uint64 `json:"count"`
	Preview string `json:"preview"`
}

type RespTroubleshootMessage struct {
	ID        int                 `json:"id"`
	Role      string              `json:"role"`
	Kind      string              `json:"kind"`
	Text      string              `json:"text,omitempty"`
	Tool      string              `json:"tool,omitempty"`
	Summary   string              `json:"summary,omitempty"`
	Detail    string              `json:"detail,omitempty"`
	Status    string              `json:"status,omitempty"`
	Link      *TroubleshootLink   `json:"link,omitempty"`
	Result    *TroubleshootResult `json:"result,omitempty"`
	CreatedAt int64               `json:"createdAt"`
}

type RespTroubleshootSession struct {
	ID         int                       `json:"id"`
	Title      string                    `json:"title"`
	Status     string                    `json:"status"`
	ShareToken string                    `json:"shareToken,omitempty"`
	UpdatedAt  int64                     `json:"updatedAt"`
	Pending    *RespTroubleshootPending  `json:"pending,omitempty"`
	Messages   []RespTroubleshootMessage `json:"messages,omitempty"`
}

type RespTroubleshootShare struct {
	Token string `json:"token"`
}
