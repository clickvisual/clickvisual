package pusher

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var _ IPusher = (*DingDing)(nil)

type DingDing struct{}

func (d *DingDing) Send(channel *db.AlarmChannel, msg *db.PushMsg) (err error) {
	markdown := &view.DingTalkMarkdown{
		MsgType: "markdown",
		Markdown: &view.Markdown{
			Title: msg.Title,
			Text:  msg.Text,
		},
		At: &view.At{
			IsAtAll:   false,
			AtMobiles: msg.Mobiles,
		},
	}
	if len(msg.Mobiles) != 0 {
		markdown.At.AtMobiles = msg.Mobiles
	}
	data, err := json.Marshal(markdown)
	if err != nil {
		return errors.Wrapf(err, "json marshal failed")
	}
	req, err := http.NewRequest("POST", channel.Key, bytes.NewBuffer(data))
	if err != nil {
		return errors.Wrap(err, "new request failed")
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return errors.Wrap(err, "client do failed")
	}
	defer func() { _ = resp.Body.Close() }()
	return
}
