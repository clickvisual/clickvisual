package pusher

import (
	"bytes"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type IPusher interface {
	Send(db.Notification, *db.BaseTable, *db.Alarm, *db.AlarmFilter, *db.AlarmChannel, string) error
}

func GetPusher(typ int) (IPusher, error) {
	var err error
	switch typ {
	case db.ChannelDingDing:
		return &DingDing{}, nil
	case db.ChannelWeChat:
		return &WeChat{}, nil
	case db.ChannelFeiShu:
		return &FeiShu{}, nil
	case db.ChannelSlack:
		return &Slack{}, nil
	case db.ChannelEmail:
		return &Email{}, nil
	case db.ChannelTelegram:
		return &Telegram{}, nil
	default:
		err = errors.New("undefined channels")
	}
	return nil, err
}

// constructMessage
// Description: 提供一个通用的md模式的获取内容的方法
// param notification  通知的部分方法
// param alarm 警告的数据库连接
// param oneTheLogs 日志内容
// return title 标题
// return text 内容
// return err 错误
func constructMessage(notification db.Notification, table *db.BaseTable, alarm *db.Alarm, filter *db.AlarmFilter, partialLog string) (title, text string, err error) {
	// groupKey := notification.GroupKey
	status := notification.Status
	annotations := notification.CommonAnnotations

	var buffer bytes.Buffer
	// base info
	if status == "resolved" {
		buffer.WriteString("###  <font color=#008000>您的告警已恢复</font>\n")
	} else {
		buffer.WriteString("###  <font color=#FF0000>您有待处理的告警</font>\n")
	}
	buffer.WriteString(fmt.Sprintf("##### 告警名称: %s\n", alarm.Name))
	if alarm.Desc != "" {
		buffer.WriteString(fmt.Sprintf("##### 告警描述: %s\n", alarm.Desc))
	}

	user, _ := db.UserInfo(alarm.Uid)
	instance, _ := db.InstanceInfo(invoker.Db, table.Database.Iid)
	statusText := "告警中"

	for _, alert := range notification.Alerts {
		end := alert.StartsAt.Add(time.Minute).Unix()
		start := alert.StartsAt.Add(-db.UnitMap[alarm.Unit].Duration - time.Minute).Unix()
		annotations = alert.Annotations
		if filter.When != "" {
			buffer.WriteString(fmt.Sprintf("##### 表达式: %s\n\n", filter.When))
		}
		buffer.WriteString(fmt.Sprintf("##### 触发时间：%s\n", alert.StartsAt.Add(time.Hour*8).Format("2006-01-02 15:04:05")))
		buffer.WriteString(fmt.Sprintf("##### 相关实例：%s %s\n", instance.Name, instance.Desc))
		buffer.WriteString(fmt.Sprintf("##### 日志库：%s %s\n", table.Name, table.Desc))
		if status == "resolved" {
			statusText = "已恢复"
			buffer.WriteString("##### 状态：<font color=#008000>已恢复</font>\n")
		} else {
			buffer.WriteString("##### 状态：：<font color=red>告警中</font>\n")
		}
		buffer.WriteString(fmt.Sprintf("##### 创建人 ：%s(%s)\n", user.Username, user.Nickname))

		buffer.WriteString(fmt.Sprintf("##### %s\n\n", annotations["description"]))

		buffer.WriteString(fmt.Sprintf("##### clickvisual 跳转: %s/alarm/rules/history?id=%d&filterId=%d&start=%d&end=%d\n\n",
			strings.TrimRight(econf.GetString("app.rootURL"), "/"), alarm.ID, filter.ID, start, end,
		))
		if partialLog != "" {
			if len(partialLog) > 400 {
				buffer.WriteString(fmt.Sprintf("##### 详情: %s ...", partialLog[0:399]))
			} else {
				buffer.WriteString(fmt.Sprintf("##### 详情: %s", partialLog))
			}
		}
	}
	return fmt.Sprintf("【%s】%s", statusText, alarm.Name), buffer.String(), nil
}
