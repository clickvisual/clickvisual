package pusher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

var _ IPusher = (*WeChat)(nil)

type WeChat struct{}

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
	b1, _ := json.Marshal(nil)
	b2, _ := json.Marshal(nil)
	msg.Text = strings.ReplaceAll(msg.Text, "#####", "")
	dataJsonStr := fmt.Sprintf(`{"msgtype": "%s", "%s": {"content": "%s", "mentioned_list": %s, "mentioned_mobile_list": %s}}`, typeStr, typeStr, msg.Text, string(b1), string(b2))
	// 默认markdown 可以制作格式
	resp, err := http.Post(
		fmt.Sprintf(`%s`, channel.Key),
		"application/json",
		bytes.NewBuffer([]byte(dataJsonStr)))
	defer resp.Body.Close()
	return
}
