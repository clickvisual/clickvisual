package dto

type WebhookReq struct {
	CalledNumberList []string `json:"called_number_list"`
	CallContent      string   `json:"call_content"`
}

type WebhookResp struct {
	State string            `json:"state"`
	Data  []WebhookRespItem `json:"data"`
}

type WebhookRespItem struct {
	CalledNumber string `json:"called_number"`
	Message      string `json:"message"`
}
