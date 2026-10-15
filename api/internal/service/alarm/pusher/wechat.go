package pusher

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

var _ IPusher = (*WeChat)(nil)

type WeChat struct{ requestContext }

type MentionedOption struct {
	userIdList []string
	mobileList []string
}

func NewEmptyOption() *MentionedOption {
	return &MentionedOption{[]string{}, []string{}}
}

func NewMentionAllOption() *MentionedOption {
	return &MentionedOption{[]string{"@all"}, []string{}}
}

func NewMentionMobileOption(mobileList ...string) *MentionedOption {
	return &MentionedOption{[]string{}, mobileList}
}

// Send ...
// oneTheLogs one of the logs, detail info
func (d *WeChat) Send(channel *db.AlarmChannel, msg *db.PushMsg) (err error) {
	typeStr := "markdown"
	msg.Text = strings.ReplaceAll(msg.Text, "#####", "")
	data, err := json.Marshal(map[string]any{"msgtype": typeStr, typeStr: map[string]any{"content": msg.Text}})
	if err != nil {
		return err
	}
	// 默认markdown 可以制作格式
	resp, err := d.httpClient().Post(
		channel.Key,
		"application/json",
		bytes.NewReader(data))
	if err != nil {
		return err
	}
	defer func() {
		_ = resp.Body.Close()
	}()
	return
}
