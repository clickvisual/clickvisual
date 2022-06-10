// Package feishu  @Author arthur  09:49:00
package feishu

import (
	"strconv"
	"time"
)

// Sign 签名
type Sign struct {
	Timestamp string `json:"timestamp,omitempty"`
	Sign      string `json:"sign,omitempty"`
}

// NewSign 创建一个新的签名
//Create a new signature
func NewSign(secret string) *Sign {
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	sign := GenSign(secret, timestamp)
	return &Sign{
		Timestamp: timestamp,
		Sign:      sign,
	}
}
