package alertmanager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/shimohq/mogo/api/pkg/model/view"
)

type dd struct{}

var DD *dd

func NewDD() *dd {
	return &dd{}
}

func (d *dd) Send(notification view.Notification, dingtalkRobot string) (err error) {
	markdown, err := transformToMarkdown(notification)
	if err != nil {
		return
	}

	data, err := json.Marshal(markdown)
	if err != nil {
		return
	}

	req, err := http.NewRequest("POST", dingtalkRobot, bytes.NewBuffer(data))
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
	fmt.Println("response Status:", resp.Status)
	fmt.Println("response Headers:", resp.Header)

	return
}

// TransformToMarkdown transform alertmanager notification to dingtalk markdow message
func transformToMarkdown(notification view.Notification) (markdown *view.DingTalkMarkdown, err error) {

	groupKey := notification.GroupKey
	status := notification.Status

	annotations := notification.CommonAnnotations

	var buffer bytes.Buffer

	buffer.WriteString(fmt.Sprintf("### 告警: %s \n", notification.GroupLabels["alertname"]))

	for _, alert := range notification.Alerts {
		annotations = alert.Annotations
		buffer.WriteString(fmt.Sprintf("##### 状态：%s\n", status))
		buffer.WriteString(fmt.Sprintf("##### 开始时间：%s\n", alert.StartsAt.Add(time.Hour*8).Format("15:04:05")))
		buffer.WriteString(fmt.Sprintf("##### summary: %s\n\n", annotations["summary"]))
		buffer.WriteString(fmt.Sprintf("##### description: %s\n\n", annotations["description"]))
	}

	markdown = &view.DingTalkMarkdown{
		MsgType: "markdown",
		Markdown: &view.Markdown{
			Title: fmt.Sprintf("通知组：%s(当前状态:%s)", groupKey, status),
			Text:  buffer.String(),
		},
		At: &view.At{
			IsAtAll: false,
		},
	}

	return
}
