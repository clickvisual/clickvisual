// Package feishu  @Author arthur  09:47:00
package feishu

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// GenSign 生成消息摘要
// generates message digest
func GenSign(secret, timestamp string) string {
	// timestamp + key 做sha256, 再进行base64 encode
	// sha256, then base64 encode
	stringToSign := timestamp + "\n" + secret
	h := hmac.New(sha256.New, []byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(h.Sum(nil))
	return signature
}

func SendMsg(webhook string, v interface{}) (response interface{}, isErrResponse bool, err error) {
	if webhook == "" {
		return nil, false, errors.New("no specified webhook")
	}

	data, err := json.Marshal(v)
	if err != nil {
		return nil, false, errors.New("marshal data error")
	}

	resp, err := http.Post(webhook, "application/json", bytes.NewReader(data))
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	d, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false, err
	}

	// 返回的是成功的提示
	var res1 Response
	err = json.Unmarshal(d, &res1)
	if err != nil {
		return nil, false, err
	}
	if res1.StatusMessage != "" {
		return res1, false, nil
	}

	// 返回的是错误信息
	var res2 ErrResponse
	err = json.Unmarshal(d, &res2)
	if err != nil {
		return nil, true, err
	}
	return res2, true, nil
}
