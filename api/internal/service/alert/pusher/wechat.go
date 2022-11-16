package pusher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
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

func BuildSendTextMsg(notification db.Notification, alarm *db.Alarm, oneTheLogs string) (data string, err error) {
	dataStr, err := BuildMsg("text", notification, alarm, oneTheLogs)
	return dataStr, err
}

func BuildMsg(typeStr string, notification db.Notification, alarm *db.Alarm, oneTheLogs string) (data string, err error) {
	// groupKey := notification.GroupKey
	status := notification.Status
	annotations := notification.CommonAnnotations

	var buffer bytes.Buffer
	if status == "resolved" {
		buffer.WriteString("###  <font color=#008000>您的告警已恢复</font>\n")
	} else {
		buffer.WriteString("###  <font color=#FF0000>您有待处理的告警</font>\n")
	}
	buffer.WriteString(fmt.Sprintf("##### 告警名称: %s\n", alarm.Name))
	if alarm.Desc != "" {
		buffer.WriteString(fmt.Sprintf("##### 告警描述: %s\n", alarm.Desc))
	}

	condsFilter := egorm.Conds{}
	condsFilter["alarm_id"] = alarm.ID
	filters, err := db.AlarmFilterList(invoker.Db, condsFilter)
	if err != nil {
		return
	}
	var exp string
	if len(filters) == 1 {
		exp = filters[0].When
	}
	user, _ := db.UserInfo(alarm.Uid)
	_, relatedList, _ := db.GetAlarmTableInstanceInfo(alarm.ID)
	var (
		table db.BaseTable
		ins   db.BaseInstance
	)
	if len(relatedList) > 0 {
		table = relatedList[0].Table
		ins = relatedList[0].Instance
	}
	for _, alert := range notification.Alerts {
		end := alert.StartsAt.Add(time.Minute).Unix()
		start := alert.StartsAt.Add(-db.UnitMap[alarm.Unit].Duration - time.Minute).Unix()
		annotations = alert.Annotations
		if exp != "" {
			buffer.WriteString(fmt.Sprintf("表达式: %s\n", exp))
		}
		buffer.WriteString(fmt.Sprintf("相关实例：<font color=info>%s %s</font>\n", ins.Name, ins.Desc))
		buffer.WriteString(fmt.Sprintf("日志库：<font color=info>%s %s</font>\n", table.Name, table.Desc))
		buffer.WriteString(fmt.Sprintf("触发时间：<font color=info>%s</font>\n", alert.StartsAt.Add(time.Hour*8).Format("2006-01-02 15:04:05")))
		if status == "resolved" {
			buffer.WriteString("状态：<font color=info>已恢复</font>")
		} else {
			buffer.WriteString("状态：<font color=warning>告警中</font>")
		}
		buffer.WriteString(fmt.Sprintf("<font color=warning>  %s</font>\n", annotations["description"]))
		buffer.WriteString(fmt.Sprintf("创建人 ：%s(@%s)\n", user.Username, user.Nickname))
		buffer.WriteString(fmt.Sprintf("跳转: [查看详情](%s/alarm/rules/history?id=%d&start=%d&end=%d)\n",
			strings.TrimRight(econf.GetString("app.rootURL"), "/"), alarm.ID, start, end,
		))
		if oneTheLogs != "" {
			oneTheLogs = strings.Replace(oneTheLogs, "\"", "", -1)
			if len(oneTheLogs) > 400 {
				buffer.WriteString(fmt.Sprintf("详情: %s ...\n", oneTheLogs[0:399]))
			} else {
				buffer.WriteString(fmt.Sprintf("详情: %s  \n", oneTheLogs))
			}
		}
	}

	b1, _ := json.Marshal(nil)
	b2, _ := json.Marshal(nil)
	dataJsonStr := fmt.Sprintf(`{"msgtype": "%s", "%s": {"content": "%s", "mentioned_list": %s, "mentioned_mobile_list": %s}}`, typeStr, typeStr, buffer.String(), string(b1), string(b2))
	fmt.Println(dataJsonStr)
	if err != nil {
		return dataJsonStr, err
	} else {
		return dataJsonStr, nil
	}
}

// Send ...
// oneTheLogs one of the logs, detail info
func (d *WeChat) Send(channel *db.AlarmChannel, title, content string) (err error) {
	// 默认markdown 可以制作格式
	resp, err := http.Post(
		fmt.Sprintf(`%s`, channel.Key),
		"application/json",
		bytes.NewBuffer([]byte(content)))
	defer resp.Body.Close()
	return
}
