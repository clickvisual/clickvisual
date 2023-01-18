package feishu

import "encoding/json"

// ErrResponse 返回的错误信息
// error message returned
type ErrResponse struct {
	Code int    `json:"code,omitempty"`
	Msg  string `json:"msg,omitempty"`
}

// Response 成功发送之后的消息
// Message after successfully sent
type Response struct {
	Extra         json.RawMessage
	StatusCode    int
	StatusMessage string
}
