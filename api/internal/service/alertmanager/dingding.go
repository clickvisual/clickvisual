package alertmanager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"

	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type DingDing struct{}

func (d *DingDing) Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel) (err error) {
	markdown, err := d.transformToMarkdown(notification, alarm)
	if err != nil {
		return
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
	fmt.Println("response Status:", resp.Status)
	fmt.Println("response Headers:", resp.Header)
	return
}

// TransformToMarkdown transform alertmanager notification to dingtalk markdow message
func (d *DingDing) transformToMarkdown(notification view.Notification, alarm *db.Alarm) (markdown *view.DingTalkMarkdown, err error) {

	groupKey := notification.GroupKey
	status := notification.Status

	annotations := notification.CommonAnnotations

	var buffer bytes.Buffer

	buffer.WriteString(fmt.Sprintf("### 告警: %s \n", alarm.Name))
	if alarm.Desc != "" {
		buffer.WriteString(fmt.Sprintf("##### 备注: %s\n", alarm.Desc))
	}
	// buffer.WriteString(fmt.Sprintf("##### alertname: %s \n", notification.GroupLabels["alertname"]))

	for _, alert := range notification.Alerts {
		annotations = alert.Annotations
		buffer.WriteString(fmt.Sprintf("##### 状态：%s\n", status))
		buffer.WriteString(fmt.Sprintf("##### 时间：%s\n", alert.StartsAt.Add(time.Hour*8).Format("15:04:05")))
		buffer.WriteString(fmt.Sprintf("##### 概要: %s\n\n", annotations["summary"]))
		buffer.WriteString(fmt.Sprintf("##### 说明: %s\n\n", annotations["description"]))
		buffer.WriteString(fmt.Sprintf("##### 链接: %s/alarm/rules\n\n", strings.TrimRight(econf.GetString("app.rootURL"), "/")))
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
