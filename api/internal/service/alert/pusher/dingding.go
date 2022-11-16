package pusher

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

var _ IPusher = (*DingDing)(nil)

type DingDing struct{}

func (d *DingDing) Send(channel *db.AlarmChannel, title, content string) (err error) {
	markdown := &view.DingTalkMarkdown{
		MsgType: "markdown",
		Markdown: &view.Markdown{
			Title: title,
			Text:  content,
		},
		At: &view.At{
			IsAtAll: false,
		},
	}
	data, err := json.Marshal(markdown)
	if err != nil {
		return
	}
	req, err := http.NewRequest("POST", channel.Key, bytes.NewBuffer(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer func() { _ = resp.Body.Close() }()
	return
}
