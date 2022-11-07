package pusher

import (
	"bytes"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type Operator interface {
	Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel, oneTheLogs string) (err error)
}

func Instance(typ int) (Operator, error) {
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

// transformToMarkdown
// Description: 提供一个通用的md模式的获取内容的方法
// param notification  通知的部分方法
// param alarm 警告的数据库连接
// param oneTheLogs 日志内容
// return title 标题
// return text 内容
// return err 错误
func transformToMarkdown(notification view.Notification, alarm *db.Alarm, partialLog string) (title, text string, err error) {
	groupKey := notification.GroupKey
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
	filters, err := db.AlarmFilterList(condsFilter)
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
			buffer.WriteString(fmt.Sprintf("##### 表达式: %s\n\n", exp))
		}
		buffer.WriteString(fmt.Sprintf("##### 触发时间：%s\n", alert.StartsAt.Add(time.Hour*8).Format("2006-01-02 15:04:05")))
		buffer.WriteString(fmt.Sprintf("##### 相关实例：%s %s\n", ins.Name, ins.Desc))
		buffer.WriteString(fmt.Sprintf("##### 日志库：%s %s\n", table.Name, table.Desc))
		if status == "resolved" {
			buffer.WriteString("##### 状态：<font color=#008000>已恢复</font>\n")
		} else {
			buffer.WriteString("##### 状态：：<font color=red>告警中</font>\n")
		}
		buffer.WriteString(fmt.Sprintf("##### 创建人 ：%s(%s)\n", user.Username, user.Nickname))

		buffer.WriteString(fmt.Sprintf("##### %s\n\n", annotations["description"]))

		buffer.WriteString(fmt.Sprintf("##### clickvisual 跳转: %s/alarm/rules/history?id=%d&start=%d&end=%d\n\n",
			strings.TrimRight(econf.GetString("app.rootURL"), "/"), alarm.ID, start, end,
		))
		if partialLog != "" {
			if len(partialLog) > 400 {
				buffer.WriteString(fmt.Sprintf("##### 详情: %s ...", partialLog[0:399]))
			} else {
				buffer.WriteString(fmt.Sprintf("##### 详情: %s", partialLog))
			}
		}
	}
	return fmt.Sprintf("通知组：%s(当前状态:%s)", groupKey, status), buffer.String(), nil
}
