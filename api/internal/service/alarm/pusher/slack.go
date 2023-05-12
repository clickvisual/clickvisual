package pusher

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/slack-go/slack"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

const (
	COLOR      = "#8b0000"
	SUBNAME    = "alarm"
	AUTHORLINK = ""
	ICON       = "https://avatars.githubusercontent.com/u/104639309?s=200&v=4"
	FOOTER     = "clickvisual"
)

var _ IPusher = (*Slack)(nil)

type Slack struct{}

func (s *Slack) Send(channel *db.AlarmChannel, msg *db.PushMsg) (err error) {
	err = s.sendMessage(channel.Key, msg.Title, msg.Text)
	if err != nil {
		return err
	}
	return nil
}

// sendMessage
//
//	Description: 发送slack信息
//	receiver s
//	 param url webhook 信息
//	 param title 标题
//	 param text 内容
//	return err
func (s *Slack) sendMessage(url string, title, text string) (err error) {
	attachment := slack.Attachment{
		Color:         COLOR,
		AuthorName:    title,
		AuthorSubname: SUBNAME,
		AuthorLink:    AUTHORLINK,
		AuthorIcon:    ICON,
		Text:          text,
		Footer:        FOOTER,
		FooterIcon:    ICON,
		Ts:            json.Number(strconv.FormatInt(time.Now().Unix(), 10)),
	}
	msg := slack.WebhookMessage{
		Attachments: []slack.Attachment{attachment},
	}
	err = slack.PostWebhook(url, &msg)
	if err != nil {
		return err
	}
	return nil
}
