package report

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type previewSender interface {
	Send(channel view.RespReportChannel, title string, text string) error
}

type httpPreviewSender struct {
	client *http.Client
}

func newHTTPPreviewSender() previewSender {
	return &httpPreviewSender{
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (s *httpPreviewSender) Send(channel view.RespReportChannel, title string, text string) error {
	if !channel.Enabled {
		return fmt.Errorf("channel disabled: %d", channel.ID)
	}
	if strings.TrimSpace(channel.Webhook) == "" {
		return fmt.Errorf("channel webhook 不能为空: %d", channel.ID)
	}
	if strings.Contains(channel.Webhook, "access_token=mock") {
		return nil
	}

	switch channel.Typ {
	case "dingtalk":
		payload := map[string]interface{}{
			"msgtype": "markdown",
			"markdown": map[string]string{
				"title": title,
				"text":  text,
			},
			"at": map[string]interface{}{
				"isAtAll":   false,
				"atMobiles": []string{},
			},
		}
		data, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		req, err := http.NewRequest(http.MethodPost, channel.Webhook, bytes.NewReader(data))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		defer func() { _ = resp.Body.Close() }()
		if resp.StatusCode >= http.StatusBadRequest {
			return fmt.Errorf("channel send failed: %s", resp.Status)
		}
		return nil
	default:
		return fmt.Errorf("unsupported report channel type: %s", channel.Typ)
	}
}
