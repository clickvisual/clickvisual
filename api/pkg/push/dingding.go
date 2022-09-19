package push

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type DingDing struct{}

func (d *DingDing) Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel, oneTheLogs string) (err error) {
	markdown, err := d.transformToMarkdown(notification, alarm, oneTheLogs)
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
	return
}

// TransformToMarkdown transform alertmanager notification to dingtalk markdow message
func (d *DingDing) transformToMarkdown(notification view.Notification, alarm *db.Alarm, oneTheLogs string) (markdown *view.DingTalkMarkdown, err error) {

	// groupKey := notification.GroupKey
	status := notification.Status
	annotations := notification.CommonAnnotations

	var buffer bytes.Buffer
	buffer.WriteString("### ClickVisual 告警\n")
	buffer.WriteString(fmt.Sprintf("##### 告警名称: %s\n", alarm.Name))
	if alarm.Desc != "" {
		buffer.WriteString(fmt.Sprintf("##### 告警描述: %s\n", alarm.Desc))
	}
	status = "告警中"
	if status == "resolved" {
		status = "已恢复"
	}

	condsFilter := egorm.Conds{}
	condsFilter["alarm_id"] = alarm.ID
	filters, err := db.AlarmFilterList(condsFilter)
	if err != nil {
		return
	}
	var exp string
	if len(filters) == 1 {
		exp = filters[0].When
	}
	user, _ := db.UserInfo(alarm.Uid)
	ins, table, _, _ := db.GetAlarmTableInstanceInfo(alarm.ID)
	for _, alert := range notification.Alerts {
		end := alert.StartsAt.Add(time.Minute).Unix()
		start := alert.StartsAt.Add(-db.UnitMap[alarm.Unit].Duration - time.Minute).Unix()
		annotations = alert.Annotations
		if exp != "" {
			buffer.WriteString(fmt.Sprintf("##### 表达式: %s\n\n", exp))
		}

		buffer.WriteString(fmt.Sprintf("##### 触发时间：%s\n", alert.StartsAt.Add(time.Hour*8).Format("2006-01-02 15:04:05")))
		buffer.WriteString(fmt.Sprintf("##### 相关实例：%s %s\n", ins.Name, ins.Desc))
		buffer.WriteString(fmt.Sprintf("##### 日志库：%s %s\n", table.Name, table.Desc))
		buffer.WriteString(fmt.Sprintf("##### 状态：%s\n", status))
		buffer.WriteString(fmt.Sprintf("##### 创建人 ：%s(%s)\n", user.Username, user.Nickname))

		buffer.WriteString(fmt.Sprintf("##### %s\n\n", annotations["description"]))

		buffer.WriteString(fmt.Sprintf("##### clickvisual 跳转: %s/alarm/rules/history?id=%d&start=%d&end=%d\n\n",
			strings.TrimRight(econf.GetString("app.rootURL"), "/"), alarm.ID, start, end,
		))
		if oneTheLogs != "" {
			buffer.WriteString(fmt.Sprintf("##### 详情: %s", oneTheLogs))
		}
	}

	markdown = &view.DingTalkMarkdown{
		MsgType: "markdown",
		Markdown: &view.Markdown{
			Title: fmt.Sprintf("【%s】%s", status, alarm.Name),
			Text:  buffer.String(),
		},
		At: &view.At{
			IsAtAll: false,
		},
	}
	return
}
