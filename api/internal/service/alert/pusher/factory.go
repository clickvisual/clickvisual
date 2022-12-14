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
	Send(*db.AlarmChannel, *db.PushMsg) error
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

// BuildAlarmMsg
// Description: 提供一个通用的md模式的获取内容的方法
// param notification  通知的部分方法
// param alarm 警告的数据库连接
// param oneTheLogs 日志内容
func BuildAlarmMsg(notification db.Notification, table *db.BaseTable, alarm *db.Alarm, filter *db.AlarmFilter, partialLog string) (msg *db.PushMsg, err error) {
	// groupKey := notification.GroupKey
	status := notification.Status
	annotations := notification.CommonAnnotations
	var buffer bytes.Buffer
	// base info
	if status == "resolved" {
		buffer.WriteString(" [鲜花]您的告警已恢复\n")
	} else {
		buffer.WriteString(" [火]您有待处理的告警\n")
	}
	buffer.WriteString(fmt.Sprintf("【告警名称】: %s\n", alarm.Name))
	if alarm.Desc != "" {
		buffer.WriteString(fmt.Sprintf("【告警描述】: %s\n", alarm.Desc))
	}
	user, _ := db.UserInfo(alarm.Uid)
	instance, _ := db.InstanceInfo(invoker.Db, table.Database.Iid)
	statusText := "告警中"
	for _, alert := range notification.Alerts {
		end := alert.StartsAt.Add(time.Minute).Unix()
		start := alert.StartsAt.Add(-db.UnitMap[alarm.Unit].Duration - time.Minute).Unix()
		annotations = alert.Annotations
		buffer.WriteString(fmt.Sprintf("【触发时间】: %s\n", alert.StartsAt.Add(time.Hour*8).Format("2006-01-02 15:04:05")))
		buffer.WriteString(fmt.Sprintf("【相关实例】: %s %s\n", instance.Name, instance.Desc))
		buffer.WriteString(fmt.Sprintf("【日志库表】: %s %s\n", table.Name, table.Desc))
		if status == "resolved" {
			statusText = "已恢复"
			buffer.WriteString("【告警状态】: 已恢复\n")
		} else {
			buffer.WriteString("【告警状态】: 告警中\n")
		}
		buffer.WriteString(fmt.Sprintf("【告警规则】: 创建人(%s),昵称(%s)\n", user.Username, user.Nickname))
		buffer.WriteString(fmt.Sprintf("【触发条件】: %s\n", annotations["description"]))
		buffer.WriteString(fmt.Sprintf("【链接跳转】: %s/alarm/rules/history?id=%d&filterId=%d&start=%d&end=%d\n",
			strings.TrimRight(econf.GetString("app.rootURL"), "/"), alarm.ID, filter.ID, start, end,
		))
		if partialLog != "" {
			partialLog = strings.Replace(partialLog, "\"", "", -1)
			if len(partialLog) > 600 {
				buffer.WriteString(fmt.Sprintf("【告警详情】: %s ...\n", partialLog[0:599]))
			} else {
				buffer.WriteString(fmt.Sprintf("【告警详情】: %s\n", partialLog))
			}
		}
	}
    return &db.PushMsg{
        Title:   fmt.Sprintf("【%s】%s", statusText, alarm.Name),
        Text:    buffer.String(),
        Mobiles: strings.Split(alarm.Mobiles, ","),
    }, nil
}

func Execute(channelIds []int, pushMsg *db.PushMsg) error {
	for _, channelId := range channelIds {
		channel, err := db.AlarmChannelInfo(invoker.Db, channelId)
		if err != nil {
			return err
		}
		channelPusher, err := GetPusher(channel.Typ)
		if err != nil {
			return err
		}
		err = channelPusher.Send(&channel, pushMsg)
		if err != nil {
			return err
		}
	}
	return nil
}
